import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  late Dio _dio;
  late SharedPreferences _prefs;
  String? _sessionToken;

  static const String sessionCookieName = 'ugc_session';
  static const String baseUrl = 'https://ugc-ad-platform.vercel.app';
  static const String apiBaseUrl = 'https://ugc-ad-platform.vercel.app/api';

  static String messageFromDioException(DioException error) {
    final data = error.response?.data;
    if (data is Map) {
      final message = data['error'];
      if (message is String && message.trim().isNotEmpty) {
        return message;
      }
    }

    final status = error.response?.statusCode;
    if (status == 401) {
      return 'Invalid email or password.';
    }
    if (status == 403) {
      return 'Please verify your email before signing in.';
    }
    if (status == 400) {
      return 'Invalid request. Check your email and password.';
    }

    return error.message ?? 'Request failed.';
  }

  Dio get dio => _dio;
  String? get sessionToken => _sessionToken;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    _sessionToken = _prefs.getString('session_token');
    
    _dio = Dio(BaseOptions(
      baseUrl: apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 60),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_sessionToken != null) {
          options.headers['Cookie'] = '$sessionCookieName=$_sessionToken';
          options.headers['Authorization'] = 'Bearer $_sessionToken';
        }
        if (kDebugMode) {
          print('API Request: ${options.method} ${options.path}');
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        if (kDebugMode) {
          print('API Response: ${response.statusCode} ${response.requestOptions.path}');
        }
        return handler.next(response);
      },
      onError: (DioException e, handler) {
        if (kDebugMode) {
          print('API Error: ${e.response?.statusCode} ${e.message}');
        }
        return handler.next(e);
      },
    ));
  }

  Future<void> setSessionToken(String token) async {
    _sessionToken = token;
    await _prefs.setString('session_token', token);
  }

  Future<void> clearSessionToken() async {
    _sessionToken = null;
    await _prefs.remove('session_token');
  }

  // Auth Endpoints
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });

    final data = response.data as Map<String, dynamic>;
    final token = data['token'] as String? ?? _extractSessionToken(response.headers['set-cookie']);
    if (token != null && token.isNotEmpty) {
      await setSessionToken(token);
    }

    return data;
  }

  String? _extractSessionToken(List<String>? setCookieHeaders) {
    if (setCookieHeaders == null) return null;

    for (final header in setCookieHeaders) {
      final prefix = '$sessionCookieName=';
      if (!header.contains(prefix)) continue;
      final start = header.indexOf(prefix) + prefix.length;
      final end = header.indexOf(';', start);
      return end == -1 ? header.substring(start) : header.substring(start, end);
    }

    return null;
  }

  Future<Map<String, dynamic>> signup(String email, String password, String? name) async {
    final displayName =
        (name != null && name.trim().length >= 2) ? name.trim() : email.split('@').first;
    final workspaceName =
        displayName.length >= 2 ? '$displayName Workspace' : 'My Workspace';

    final response = await _dio.post('/auth/signup', data: {
      'email': email.trim(),
      'password': password,
      'name': displayName,
      'workspaceName': workspaceName,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> logout() async {
    final response = await _dio.post('/auth/logout');
    await clearSessionToken();
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    final response = await _dio.post('/auth/forgot-password', data: {
      'email': email,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> resendVerification(String email) async {
    final response = await _dio.post('/auth/resend-verification', data: {
      'email': email,
    });
    return response.data as Map<String, dynamic>;
  }

  // User Endpoints
  Future<Map<String, dynamic>> getCurrentUser() async {
    final response = await _dio.get('/auth/me');
    return response.data as Map<String, dynamic>;
  }

  // Workspace Endpoints
  Future<Map<String, dynamic>> getWorkspace() async {
    final response = await _dio.get('/workspaces');
    final data = response.data as Map<String, dynamic>;
    final workspaces = data['workspaces'] as List<dynamic>? ?? [];
    final activeWorkspaceId = data['activeWorkspaceId'] as String?;

    final active = workspaces.cast<Map<String, dynamic>>().firstWhere(
      (workspace) => workspace['id'] == activeWorkspaceId,
      orElse: () => workspaces.isNotEmpty
          ? workspaces.first as Map<String, dynamic>
          : <String, dynamic>{},
    );

    final now = DateTime.now().toIso8601String();
    return {
      'id': active['id'] ?? '',
      'name': active['name'] ?? 'Workspace',
      'slug': active['slug'] ?? '',
      'plan': active['plan'] ?? 'free',
      'creditsRemaining': active['creditsRemaining'] ?? 0,
      'avatarUrl': active['avatarUrl'],
      'createdAt': active['createdAt'] ?? now,
      'updatedAt': active['updatedAt'] ?? now,
    };
  }

  Future<Map<String, dynamic>> updateWorkspace(Map<String, dynamic> data) async {
    final response = await _dio.patch('/workspace', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getWorkspaceMembers() async {
    final response = await _dio.get('/workspace/members');
    return response.data as List<dynamic>;
  }

  // Generation Endpoints
  Future<Map<String, dynamic>> startGeneration(Map<String, dynamic> data) async {
    final response = await _dio.post('/generate', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getGenerationStatus(String jobId) async {
    final response = await _dio.get('/generate/$jobId/status');
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getGenerations() async {
    final response = await _dio.get('/generations');
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getGeneration(String id) async {
    final response = await _dio.get('/generations/$id');
    return response.data as Map<String, dynamic>;
  }

  // Chat Endpoints
  Future<Map<String, dynamic>> createChatSession() async {
    final response = await _dio.post('/chat/sessions');
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getChatSessions() async {
    final response = await _dio.get('/chat/sessions');
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getChatSession(String sessionId) async {
    final response = await _dio.get('/chat/sessions/$sessionId');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> sendChatMessage(String sessionId, Map<String, dynamic> data) async {
    final response = await _dio.post('/chat/sessions/$sessionId/messages', data: data);
    return response.data as Map<String, dynamic>;
  }

  // Studio Endpoints
  Future<Map<String, dynamic>> createStudioFlow(Map<String, dynamic> data) async {
    final response = await _dio.post('/studio/flows', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getStudioFlows() async {
    final response = await _dio.get('/studio/flows');
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getStudioFlow(String id) async {
    final response = await _dio.get('/studio/flows/$id');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateStudioFlow(String id, Map<String, dynamic> data) async {
    final response = await _dio.patch('/studio/flows/$id', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> deleteStudioFlow(String id) async {
    final response = await _dio.delete('/studio/flows/$id');
    return response.data as Map<String, dynamic>;
  }

  // Asset Endpoints
  Future<Map<String, dynamic>> getAssets() async {
    final response = await _dio.get('/assets');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getAvatars() async {
    final response = await _dio.get('/avatars');
    return response.data as Map<String, dynamic>;
  }

  // Upload
  Future<Map<String, dynamic>> uploadAsset(File file, String kind) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path, filename: file.path.split('/').last),
      'kind': kind,
    });
    final response = await _dio.post('/studio/upload', data: formData);
    return response.data as Map<String, dynamic>;
  }

  // Billing
  Future<Map<String, dynamic>> getBillingPlans() async {
    final response = await _dio.get('/workspace/billing/plans');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> subscribeToPlan(String planId) async {
    final response = await _dio.post('/workspace/billing/subscribe', data: {
      'planId': planId,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> claimWelcomeCredits() async {
    final response = await _dio.post('/workspace/claim-credits');
    return response.data as Map<String, dynamic>;
  }

  // Notifications
  Future<List<dynamic>> getNotifications() async {
    final response = await _dio.get('/notifications');
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> markNotificationRead(String id) async {
    final response = await _dio.patch('/notifications/$id/read');
    return response.data as Map<String, dynamic>;
  }

  // Integrations
  Future<List<dynamic>> getSocialConnections() async {
    final response = await _dio.get('/integrations/connections');
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> publishToSocial(Map<String, dynamic> data) async {
    final response = await _dio.post('/integrations/publish', data: data);
    return response.data as Map<String, dynamic>;
  }

  // AI Studio Endpoints
  Future<Map<String, dynamic>> generateImage(Map<String, dynamic> data) async {
    final response = await _dio.post('/studio/image', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> generateVideo(Map<String, dynamic> data) async {
    final response = await _dio.post('/studio/video', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> generateAudio(Map<String, dynamic> data) async {
    final response = await _dio.post('/studio/audio', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> generateText(Map<String, dynamic> data) async {
    final response = await _dio.post('/studio/text', data: data);
    return response.data as Map<String, dynamic>;
  }

  // WebSocket connection for real-time
  Future<WebSocket>? connectRealtime(String flowId) {
    try {
      final wsUrl = baseUrl.replaceFirst('https', 'wss');
      final ws = WebSocket.connect('$wsUrl/api/studio/flows/$flowId/realtime');
      return ws;
    } catch (e) {
      if (kDebugMode) {
        print('WebSocket connection error: $e');
      }
      return null;
    }
  }
}
