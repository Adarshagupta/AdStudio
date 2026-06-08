import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../models/generation.dart';
import '../services/api_service.dart';

class ChatProvider extends ChangeNotifier {
  final ApiService _apiService;
  final _uuid = const Uuid();
  
  List<ChatSession> _sessions = [];
  List<ChatMessage> _messages = [];
  ChatSession? _currentSession;
  bool _isLoading = false;
  bool _isSending = false;
  String? _error;
  WebSocketChannel? _wsChannel;
  final _messageController = StreamController<ChatMessage>.broadcast();

  ChatProvider(this._apiService);

  List<ChatSession> get sessions => _sessions;
  List<ChatMessage> get messages => _messages;
  ChatSession? get currentSession => _currentSession;
  bool get isLoading => _isLoading;
  bool get isSending => _isSending;
  String? get error => _error;
  Stream<ChatMessage> get messageStream => _messageController.stream;

  Future<void> loadSessions() async {
    try {
      _isLoading = true;
      notifyListeners();
      
      final data = await _apiService.getChatSessions();
      _sessions = data.map((e) => ChatSession.fromJson(e as Map<String, dynamic>)).toList();
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMessages(String sessionId) async {
    try {
      _isLoading = true;
      notifyListeners();
      
      final data = await _apiService.getChatSession(sessionId);
      _currentSession = ChatSession.fromJson(data);
      
      if (data['messages'] != null) {
        _messages = (data['messages'] as List)
            .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
            .toList();
      } else {
        _messages = [];
      }
      
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createSession() async {
    try {
      _isLoading = true;
      notifyListeners();
      
      final data = await _apiService.createChatSession();
      final session = ChatSession.fromJson(data);
      _sessions.insert(0, session);
      _currentSession = session;
      _messages = [];
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> sendMessage(String sessionId, String text, {
    String toolMode = 'video',
    List<ChatAttachment>? attachments,
    String? productUrl,
    String? aspectRatio,
  }) async {
    if (text.trim().isEmpty && (attachments == null || attachments.isEmpty)) return;

    try {
      _isSending = true;
      notifyListeners();

      // Add user message locally
      final userMessage = ChatMessage(
        id: _uuid.v4(),
        role: 'user',
        text: text,
        toolMode: toolMode,
        attachments: attachments,
        createdAt: DateTime.now(),
      );
      _messages.add(userMessage);
      notifyListeners();

      // Add assistant placeholder
      final assistantMessage = ChatMessage(
        id: _uuid.v4(),
        role: 'assistant',
        status: 'processing',
        text: 'Creating your ${toolMode.toLowerCase()}…',
        toolMode: toolMode,
        createdAt: DateTime.now(),
      );
      _messages.add(assistantMessage);
      notifyListeners();

      // Send to API
      final data = await _apiService.sendChatMessage(sessionId, {
        'prompt': text,
        'toolMode': toolMode,
        if (attachments != null)
          'attachments': attachments.map((e) => e.toJson()).toList(),
        if (productUrl != null) 'productUrl': productUrl,
        if (aspectRatio != null) 'aspectRatio': aspectRatio,
      });

      // Update assistant message with response
      final index = _messages.indexWhere((m) => m.id == assistantMessage.id);
      if (index != -1) {
        _messages[index] = ChatMessage(
          id: assistantMessage.id,
          role: 'assistant',
          text: data['text'] as String?,
          status: data['status'] as String? ?? 'completed',
          error: data['error'] as String?,
          imageUrl: data['imageUrl'] as String?,
          videoUrl: data['videoUrl'] as String?,
          scriptText: data['scriptText'] as String?,
          generationId: data['generationId'] as String?,
          toolMode: toolMode,
          createdAt: assistantMessage.createdAt,
        );
        _messageController.add(_messages[index]);
      }

      _error = null;
    } catch (e) {
      _error = e.toString();
      // Update the assistant message with error
      final index = _messages.indexWhere((m) => m.status == 'processing' && m.role == 'assistant');
      if (index != -1) {
        _messages[index] = ChatMessage(
          id: _messages[index].id,
          role: 'assistant',
          status: 'failed',
          error: e.toString(),
          createdAt: _messages[index].createdAt,
        );
      }
    } finally {
      _isSending = false;
      notifyListeners();
    }
  }

  Future<void> pollGenerationStatus(String messageId, String generationId) async {
    int attempts = 0;
    const maxAttempts = 120;
    
    while (attempts < maxAttempts) {
      try {
        await Future.delayed(const Duration(seconds: 5));
        final data = await _apiService.getGenerationStatus(generationId);
        
        final index = _messages.indexWhere((m) => m.id == messageId);
        if (index == -1) return;

        final status = data['status'] as String?;
        
        if (status == 'COMPLETED') {
          _messages[index] = ChatMessage(
            id: _messages[index].id,
            role: 'assistant',
            status: 'completed',
            text: _messages[index].text,
            imageUrl: data['imageUrl'] as String?,
            videoUrl: data['videoUrl'] as String?,
            scriptText: data['scriptText'] as String?,
            generationId: generationId,
            toolMode: _messages[index].toolMode,
            createdAt: _messages[index].createdAt,
          );
          notifyListeners();
          return;
        } else if (status == 'FAILED') {
          _messages[index] = ChatMessage(
            id: _messages[index].id,
            role: 'assistant',
            status: 'failed',
            error: data['errorMessage'] as String? ?? 'Generation failed',
            createdAt: _messages[index].createdAt,
          );
          notifyListeners();
          return;
        }
        
        // Update script text if available
        if (data['scriptText'] != null) {
          _messages[index] = ChatMessage(
            id: _messages[index].id,
            role: 'assistant',
            status: 'processing',
            text: _messages[index].text,
            scriptText: data['scriptText'] as String?,
            generationId: generationId,
            toolMode: _messages[index].toolMode,
            createdAt: _messages[index].createdAt,
          );
          notifyListeners();
        }
        
        attempts++;
      } catch (e) {
        attempts++;
        if (attempts >= maxAttempts) {
          final index = _messages.indexWhere((m) => m.id == messageId);
          if (index != -1) {
            _messages[index] = ChatMessage(
              id: _messages[index].id,
              role: 'assistant',
              status: 'failed',
              error: 'Timed out waiting for generation',
              createdAt: _messages[index].createdAt,
            );
            notifyListeners();
          }
          return;
        }
      }
    }
  }

  void clearMessages() {
    _messages = [];
    _currentSession = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void connectRealtime(String sessionId) {
    disconnectRealtime();
    
    try {
      final wsUrl = ApiService.baseUrl.replaceFirst('https', 'wss');
      _wsChannel = WebSocketChannel.connect(
        Uri.parse('$wsUrl/api/chat/sessions/$sessionId/realtime'),
      );
      
      _wsChannel!.stream.listen(
        (message) {
          final data = jsonDecode(message as String);
          if (data['type'] == 'message') {
            final chatMessage = ChatMessage.fromJson(data['message'] as Map<String, dynamic>);
            _messages.add(chatMessage);
            _messageController.add(chatMessage);
            notifyListeners();
          }
        },
        onError: (error) {
          _error = 'WebSocket error: $error';
          notifyListeners();
        },
      );
    } catch (e) {
      _error = 'Failed to connect to realtime: $e';
      notifyListeners();
    }
  }

  void disconnectRealtime() {
    _wsChannel?.sink.close();
    _wsChannel = null;
  }

  @override
  void dispose() {
    disconnectRealtime();
    _messageController.close();
    super.dispose();
  }
}
