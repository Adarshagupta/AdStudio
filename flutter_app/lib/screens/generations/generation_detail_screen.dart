import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';

import '../../providers/generation_provider.dart';
import '../../core/theme.dart';

class GenerationDetailScreen extends StatefulWidget {
  final String generationId;

  const GenerationDetailScreen({super.key, required this.generationId});

  @override
  State<GenerationDetailScreen> createState() => _GenerationDetailScreenState();
}

class _GenerationDetailScreenState extends State<GenerationDetailScreen> {
  VideoPlayerController? _videoController;

  @override
  void initState() {
    super.initState();
    _loadGeneration();
  }

  @override
  void dispose() {
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _loadGeneration() async {
    final provider = context.read<GenerationProvider>();
    await provider.loadGeneration(widget.generationId);
    
    final generation = provider.currentGeneration;
    if (generation?.videoUrl != null) {
      _videoController = VideoPlayerController.networkUrl(
        Uri.parse(generation!.videoUrl!),
      );
      await _videoController!.initialize();
      if (mounted) {
        setState(() {});
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GenerationProvider>();
    final generation = provider.currentGeneration;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Generation Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () {
              // TODO: Download
            },
          ),
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              // TODO: Share
            },
          ),
        ],
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : generation == null
              ? const Center(child: Text('Generation not found'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (generation.hasImage)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.network(
                            generation.imageUrl!,
                            fit: BoxFit.cover,
                            width: double.infinity,
                          ),
                        )
                      else if (generation.hasVideo && _videoController != null)
                        AspectRatio(
                          aspectRatio: _videoController!.value.aspectRatio,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              VideoPlayer(_videoController!),
                              IconButton(
                                icon: Icon(
                                  _videoController!.value.isPlaying
                                      ? Icons.pause
                                      : Icons.play_arrow,
                                  size: 48,
                                  color: Colors.white,
                                ),
                                onPressed: () {
                                  setState(() {
                                    if (_videoController!.value.isPlaying) {
                                      _videoController!.pause();
                                    } else {
                                      _videoController!.play();
                                    }
                                  });
                                },
                              ),
                            ],
                          ),
                        )
                      else
                        Container(
                          height: 200,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade200,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Center(
                            child: Icon(Icons.image, size: 48, color: Colors.grey),
                          ),
                        ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: _getStatusColor(generation.status).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              generation.status ?? 'Unknown',
                              style: TextStyle(
                                color: _getStatusColor(generation.status),
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          if (generation.format != null) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                generation.format!,
                                style: const TextStyle(
                                  color: AppTheme.primaryColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 16),
                      if (generation.prompt != null) ...[
                        const Text(
                          'Prompt',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Text(generation.prompt!),
                        ),
                      ],
                      if (generation.scriptText != null) ...[
                        const SizedBox(height: 24),
                        const Text(
                          'Script',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Text(generation.scriptText!),
                        ),
                      ],
                      const SizedBox(height: 24),
                      const Text(
                        'Details',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 8),
                      _DetailRow(
                        label: 'Created',
                        value: generation.createdAt.toString(),
                      ),
                      if (generation.completedAt != null)
                        _DetailRow(
                          label: 'Completed',
                          value: generation.completedAt.toString(),
                        ),
                      if (generation.xaiRequestId != null)
                        _DetailRow(
                          label: 'Request ID',
                          value: generation.xaiRequestId!,
                        ),
                      const SizedBox(height: 32),
                      if (generation.isCompleted)
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  // TODO: Download
                                },
                                icon: const Icon(Icons.download),
                                label: const Text('Download'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  // TODO: Publish
                                },
                                icon: const Icon(Icons.publish),
                                label: const Text('Publish'),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return AppTheme.successColor;
      case 'FAILED':
        return AppTheme.errorColor;
      case 'PROCESSING':
        return AppTheme.warningColor;
      default:
        return Colors.grey;
    }
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
