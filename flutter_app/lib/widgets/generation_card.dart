import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../models/generation.dart';

/// Grid tile used in the Library to preview a single creation.
class GenerationCard extends StatelessWidget {
  final Generation generation;
  final VoidCallback onTap;

  const GenerationCard({
    super.key,
    required this.generation,
    required this.onTap,
  });

  Color get _statusColor {
    if (generation.isCompleted) return AppTheme.success;
    if (generation.isFailed) return AppTheme.error;
    return AppTheme.warning;
  }

  @override
  Widget build(BuildContext context) {
    final preview = generation.previewImage;

    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (preview != null)
              CachedNetworkImage(
                imageUrl: preview,
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(color: AppTheme.surfaceElevated),
                errorWidget: (_, __, ___) => _Placeholder(generation: generation),
              )
            else
              _Placeholder(generation: generation),
            // Bottom gradient for legibility.
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.center,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Color(0xCC000000)],
                ),
              ),
            ),
            // Status chip.
            Positioned(
              top: 10,
              left: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: _statusColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      generation.statusLabel,
                      style: const TextStyle(color: Colors.white, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
            // Video play indicator.
            if (generation.isVideo)
              Positioned(
                top: 10,
                right: 10,
                child: Icon(
                  Icons.play_circle_fill_rounded,
                  color: Colors.white.withValues(alpha: 0.9),
                  size: 22,
                ),
              ),
            // Title + time.
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    generation.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      height: 1.25,
                    ),
                  ),
                  if (generation.relativeTime.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(
                      generation.relativeTime,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.65),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  final Generation generation;

  const _Placeholder({required this.generation});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceElevated,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Center(
        child: Icon(
          generation.isVideo
              ? Icons.movie_outlined
              : Icons.image_outlined,
          color: AppTheme.textMuted,
          size: 40,
        ),
      ),
    );
  }
}
