import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../core/theme.dart';
import '../models/generation.dart';

class VideoFeedItem extends StatefulWidget {
  final Generation generation;
  final bool isActive;

  const VideoFeedItem({
    super.key,
    required this.generation,
    required this.isActive,
  });

  @override
  State<VideoFeedItem> createState() => _VideoFeedItemState();
}

class _VideoFeedItemState extends State<VideoFeedItem> {
  VideoPlayerController? _controller;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _setupPlayer();
  }

  @override
  void didUpdateWidget(VideoFeedItem oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.generation.id != widget.generation.id) {
      _disposePlayer();
      _setupPlayer();
    } else if (oldWidget.isActive != widget.isActive) {
      _syncPlayback();
    }
  }

  Future<void> _setupPlayer() async {
    final url = widget.generation.videoUrl;
    if (url == null || url.isEmpty) return;

    final controller = VideoPlayerController.networkUrl(Uri.parse(url));
    _controller = controller;

    try {
      await controller.initialize();
      controller.setLooping(true);
      if (!mounted) return;
      setState(() => _initialized = true);
      _syncPlayback();
    } catch (_) {
      _disposePlayer();
    }
  }

  void _syncPlayback() {
    final controller = _controller;
    if (controller == null || !_initialized) return;

    if (widget.isActive) {
      controller.play();
    } else {
      controller.pause();
    }
  }

  void _disposePlayer() {
    _controller?.dispose();
    _controller = null;
    _initialized = false;
  }

  @override
  void dispose() {
    _disposePlayer();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        _buildMedia(),
        _buildGradient(),
        _buildMeta(context),
        if (widget.generation.isProcessing) _buildProcessingBadge(),
      ],
    );
  }

  Widget _buildMedia() {
    if (_initialized && _controller != null) {
      return FittedBox(
        fit: BoxFit.cover,
        child: SizedBox(
          width: _controller!.value.size.width,
          height: _controller!.value.size.height,
          child: VideoPlayer(_controller!),
        ),
      );
    }

    final thumb = widget.generation.thumbnailUrl;
    if (thumb != null && thumb.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: thumb,
        fit: BoxFit.cover,
        placeholder: (_, __) => Container(color: AppTheme.surface),
        errorWidget: (_, __, ___) => Container(color: AppTheme.surface),
      );
    }

    return Container(
      color: AppTheme.surface,
      child: const Center(
        child: Icon(Icons.movie_outlined, color: AppTheme.textMuted, size: 64),
      ),
    );
  }

  Widget _buildGradient() {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withValues(alpha: 0.15),
            Colors.transparent,
            Colors.black.withValues(alpha: 0.55),
            Colors.black.withValues(alpha: 0.85),
          ],
          stops: const [0, 0.35, 0.75, 1],
        ),
      ),
    );
  }

  Widget _buildMeta(BuildContext context) {
    return Positioned(
      left: 16,
      right: 80,
      bottom: 120,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.generation.format != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
              ),
              child: Text(
                widget.generation.format!,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.2,
                ),
              ),
            ),
          const SizedBox(height: 10),
          Text(
            widget.generation.title,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w500,
              height: 1.35,
            ),
          ),
          if (widget.generation.timestamp != null) ...[
            const SizedBox(height: 6),
            Text(
              widget.generation.timestamp!,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.65),
                fontSize: 13,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildProcessingBadge() {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.55),
          borderRadius: BorderRadius.circular(24),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
            SizedBox(width: 10),
            Text('Generating…', style: TextStyle(color: Colors.white)),
          ],
        ),
      ),
    );
  }
}
