import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/generation_provider.dart';
import '../../core/theme.dart';

class GenerationsScreen extends StatefulWidget {
  const GenerationsScreen({super.key});

  @override
  State<GenerationsScreen> createState() => _GenerationsScreenState();
}

class _GenerationsScreenState extends State<GenerationsScreen> {
  @override
  void initState() {
    super.initState();
    _loadGenerations();
  }

  Future<void> _loadGenerations() async {
    final provider = context.read<GenerationProvider>();
    await provider.loadGenerations(refresh: true);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GenerationProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Generations'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              // TODO: Show filter
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadGenerations,
        child: provider.isLoading && provider.generations.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : provider.generations.isEmpty
                ? _EmptyState(onRefresh: _loadGenerations)
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: provider.generations.length,
                    itemBuilder: (context, index) {
                      final generation = provider.generations[index];
                      return _GenerationCard(
                        generation: generation,
                        onTap: () => context.push('/generations/${generation.id}'),
                      );
                    },
                  ),
      ),
    );
  }
}

class _GenerationCard extends StatelessWidget {
  final dynamic generation;
  final VoidCallback onTap;

  const _GenerationCard({
    required this.generation,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (generation.hasImage)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(
                    generation.imageUrl ?? generation.thumbnailUrl ?? '',
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: Colors.grey.shade200,
                        child: const Icon(Icons.broken_image, color: Colors.grey),
                      );
                    },
                  ),
                ),
              )
            else if (generation.hasVideo)
              Container(
                height: 180,
                decoration: BoxDecoration(
                  color: Colors.grey.shade900,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: const Center(
                  child: Icon(Icons.videocam, size: 48, color: Colors.white54),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _StatusBadge(status: generation.status ?? 'UNKNOWN'),
                      const SizedBox(width: 8),
                      if (generation.format != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            generation.format!,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (generation.prompt != null)
                    Text(
                      generation.prompt!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14),
                    ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(
                        Icons.schedule,
                        size: 14,
                        color: Colors.grey.shade500,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatDate(generation.createdAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    
    if (diff.inDays == 0) {
      if (diff.inHours == 0) {
        return '${diff.inMinutes}m ago';
      }
      return '${diff.inHours}h ago';
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else {
      return '${date.month}/${date.day}/${date.year}';
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        color = AppTheme.successColor;
        label = 'Completed';
        break;
      case 'FAILED':
        color = AppTheme.errorColor;
        label = 'Failed';
        break;
      case 'PROCESSING':
        color = AppTheme.warningColor;
        label = 'Processing';
        break;
      case 'PENDING':
        color = Colors.blue;
        label = 'Pending';
        break;
      default:
        color = Colors.grey;
        label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onRefresh;

  const _EmptyState({required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              Icons.video_library_outlined,
              size: 48,
              color: Colors.grey.shade400,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'No generations yet',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Start generating content from the dashboard',
            style: TextStyle(color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () => context.go('/dashboard'),
            icon: const Icon(Icons.add),
            label: const Text('Create New'),
          ),
        ],
      ),
    );
  }
}
