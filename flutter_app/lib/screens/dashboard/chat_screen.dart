import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';

import '../../models/generation.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat_provider.dart';
import '../../core/theme.dart';

class ChatScreen extends StatefulWidget {
  final String sessionId;

  const ChatScreen({super.key, required this.sessionId});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  final _imagePicker = ImagePicker();
  String _toolMode = 'video';
  final List<ChatAttachment> _attachments = [];
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    final chatProvider = context.read<ChatProvider>();
    await chatProvider.loadMessages(widget.sessionId);
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty && _attachments.isEmpty) return;

    final chatProvider = context.read<ChatProvider>();
    
    _textController.clear();
    final attachments = List<ChatAttachment>.from(_attachments);
    _attachments.clear();
    setState(() {});

    await chatProvider.sendMessage(
      widget.sessionId,
      text,
      toolMode: _toolMode,
      attachments: attachments.isEmpty ? null : attachments,
    );

    _scrollToBottom();
  }

  Future<void> _pickImage() async {
    try {
      final picked = await _imagePicker.pickImage(source: ImageSource.gallery);
      if (picked == null) return;

      setState(() => _isUploading = true);
      
      final file = File(picked.path);
      final chatProvider = context.read<ChatProvider>();
      
      // Upload via API
      // This is a simplified version - in production you'd upload to your server
      _attachments.add(ChatAttachment(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        kind: 'image',
        url: picked.path,
        previewUrl: picked.path,
        name: picked.name,
      ));
      
      setState(() => _isUploading = false);
    } catch (e) {
      setState(() => _isUploading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pick image: $e')),
        );
      }
    }
  }

  Future<void> _pickVideo() async {
    try {
      final picked = await _imagePicker.pickVideo(source: ImageSource.gallery);
      if (picked == null) return;

      setState(() => _isUploading = true);
      
      _attachments.add(ChatAttachment(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        kind: 'video',
        url: picked.path,
        previewUrl: picked.path,
        name: picked.name,
      ));
      
      setState(() => _isUploading = false);
    } catch (e) {
      setState(() => _isUploading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pick video: $e')),
        );
      }
    }
  }

  void _removeAttachment(String id) {
    setState(() {
      _attachments.removeWhere((a) => a.id == id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final chatProvider = context.watch<ChatProvider>();
    final authProvider = context.watch<AuthProvider>();
    final canCreate = authProvider.user != null;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/dashboard'),
        ),
        title: const Text('AI Chat'),
        actions: [
          PopupMenuButton<String>(
            initialValue: _toolMode,
            onSelected: (value) {
              setState(() => _toolMode = value);
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'video',
                child: Row(
                  children: [
                    Icon(Icons.videocam, size: 20),
                    SizedBox(width: 8),
                    Text('Generate Video'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'image',
                child: Row(
                  children: [
                    Icon(Icons.image, size: 20),
                    SizedBox(width: 8),
                    Text('Generate Image'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'edit-video',
                child: Row(
                  children: [
                    Icon(Icons.edit, size: 20),
                    SizedBox(width: 8),
                    Text('Edit Video'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'extend-video',
                child: Row(
                  children: [
                    Icon(Icons.extension, size: 20),
                    SizedBox(width: 8),
                    Text('Extend Video'),
                  ],
                ),
              ),
            ],
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    _toolMode == 'image'
                        ? Icons.image
                        : Icons.videocam,
                    size: 18,
                  ),
                  const SizedBox(width: 4),
                  Text(_toolModeLabel(_toolMode)),
                  const Icon(Icons.arrow_drop_down, size: 18),
                ],
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: chatProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : chatProvider.messages.isEmpty
                    ? _EmptyChat(
                        onStarterTap: (text) {
                          _textController.text = text;
                          _sendMessage();
                        },
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: chatProvider.messages.length,
                        itemBuilder: (context, index) {
                          final message = chatProvider.messages[index];
                          return _ChatBubble(
                            message: message,
                            isUser: message.isUser,
                          );
                        },
                      ),
          ),
          if (_attachments.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _attachments.map((attachment) {
                    return _AttachmentPreview(
                      attachment: attachment,
                      onRemove: () => _removeAttachment(attachment.id),
                    );
                  }).toList(),
                ),
              ),
            ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  IconButton(
                    icon: _isUploading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.add),
                    onPressed: _isUploading
                        ? null
                        : () => _showAttachmentOptions(context),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      decoration: InputDecoration(
                        hintText: 'Describe what to create...',
                        filled: true,
                        fillColor: Colors.grey.shade100,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                      maxLines: null,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: chatProvider.isSending
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                    color: AppTheme.primaryColor,
                    onPressed: chatProvider.isSending || !canCreate
                        ? null
                        : _sendMessage,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAttachmentOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.image),
              title: const Text('Add Image'),
              onTap: () {
                Navigator.pop(context);
                _pickImage();
              },
            ),
            ListTile(
              leading: const Icon(Icons.videocam),
              title: const Text('Add Video'),
              onTap: () {
                Navigator.pop(context);
                _pickVideo();
              },
            ),
          ],
        ),
      ),
    );
  }

  String _toolModeLabel(String mode) {
    switch (mode) {
      case 'video':
        return 'Video';
      case 'image':
        return 'Image';
      case 'edit-video':
        return 'Edit';
      case 'extend-video':
        return 'Extend';
      default:
        return 'Video';
    }
  }
}

class _ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isUser;

  const _ChatBubble({
    required this.message,
    required this.isUser,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        child: Column(
          crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (message.attachments?.isNotEmpty ?? false)
              _buildAttachments(message.attachments!),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isUser ? AppTheme.primaryColor : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (message.text != null)
                    Text(
                      message.text!,
                      style: TextStyle(
                        color: isUser ? Colors.white : AppTheme.textPrimary,
                        fontSize: 15,
                      ),
                    ),
                  if (message.isProcessing)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: isUser ? Colors.white70 : AppTheme.primaryColor,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Working...',
                            style: TextStyle(
                              color: isUser ? Colors.white70 : AppTheme.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (message.isFailed && message.error != null)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.errorColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        message.error!,
                        style: const TextStyle(
                          color: AppTheme.errorColor,
                          fontSize: 13,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            if (message.scriptText != null)
              Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'SCRIPT',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textMuted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      message.scriptText!,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            if (message.imageUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  message.imageUrl!,
                  fit: BoxFit.cover,
                  loadingBuilder: (context, child, progress) {
                    if (progress == null) return child;
                    return Container(
                      width: double.infinity,
                      height: 200,
                      color: Colors.grey.shade200,
                      child: const Center(child: CircularProgressIndicator()),
                    );
                  },
                ),
              ),
            if (message.videoUrl != null)
              _VideoPlayer(url: message.videoUrl!),
            if (message.isCompleted && message.generationId != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => context.push('/generations/${message.generationId}'),
                      icon: const Icon(Icons.open_in_new, size: 16),
                      label: const Text('View Details'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        textStyle: const TextStyle(fontSize: 12),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.download, size: 20),
                      onPressed: () {
                        // TODO: Implement download
                      },
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttachments(List<ChatAttachment> attachments) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: attachments.map((attachment) {
        if (attachment.isImage) {
          return ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              attachment.previewUrl ?? attachment.url,
              width: 80,
              height: 80,
              fit: BoxFit.cover,
            ),
          );
        } else {
          return Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.videocam, color: AppTheme.textMuted),
          );
        }
      }).toList(),
    );
  }
}

class _VideoPlayer extends StatefulWidget {
  final String url;

  const _VideoPlayer({required this.url});

  @override
  State<_VideoPlayer> createState() => _VideoPlayerState();
}

class _VideoPlayerState extends State<_VideoPlayer> {
  VideoPlayerController? _controller;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url));
    await _controller!.initialize();
    if (mounted) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_controller == null || !_controller!.value.isInitialized) {
      return Container(
        height: 200,
        color: Colors.grey.shade200,
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    return AspectRatio(
      aspectRatio: _controller!.value.aspectRatio,
      child: Stack(
        alignment: Alignment.center,
        children: [
          VideoPlayer(_controller!),
          IconButton(
            icon: Icon(
              _controller!.value.isPlaying ? Icons.pause : Icons.play_arrow,
              size: 48,
              color: Colors.white,
            ),
            onPressed: () {
              setState(() {
                if (_controller!.value.isPlaying) {
                  _controller!.pause();
                } else {
                  _controller!.play();
                }
              });
            },
          ),
        ],
      ),
    );
  }
}

class _AttachmentPreview extends StatelessWidget {
  final ChatAttachment attachment;
  final VoidCallback onRemove;

  const _AttachmentPreview({
    required this.attachment,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          width: 80,
          height: 80,
          margin: const EdgeInsets.only(right: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: attachment.isImage
                ? Image.file(
                    File(attachment.url),
                    fit: BoxFit.cover,
                  )
                : Container(
                    color: Colors.grey.shade200,
                    child: const Icon(Icons.videocam, color: AppTheme.textMuted),
                  ),
          ),
        ),
        Positioned(
          top: 4,
          right: 12,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(
                color: Colors.black54,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.close,
                size: 14,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _EmptyChat extends StatelessWidget {
  final Function(String) onStarterTap;

  const _EmptyChat({required this.onStarterTap});

  @override
  Widget build(BuildContext context) {
    final starters = [
      'Create a UGC video about a fitness app',
      'Generate a product showcase image',
      'Make a brain rot style video',
      'Edit this video to add product overlay',
    ];

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryColor, Color(0xFF8B5CF6)],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withOpacity(0.3),
                    blurRadius: 20,
                  ),
                ],
              ),
              child: const Icon(
                Icons.auto_fix_high,
                size: 48,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'What would you like to create?',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Chat to generate images and videos, edit clips, or extend footage',
              style: TextStyle(color: AppTheme.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ...starters.map((starter) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Card(
                child: InkWell(
                  onTap: () => onStarterTap(starter),
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.lightbulb_outline,
                          color: AppTheme.primaryColor,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            starter,
                            style: const TextStyle(fontSize: 14),
                          ),
                        ),
                        const Icon(
                          Icons.arrow_forward_ios,
                          size: 16,
                          color: AppTheme.textMuted,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            )),
          ],
        ),
      ),
    );
  }
}
