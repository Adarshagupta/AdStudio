import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../core/theme.dart';

enum LiteMoovLogoLayout { horizontal, stacked }

class LiteMoovLogo extends StatelessWidget {
  final double markSize;
  final bool showWordmark;
  final double wordmarkSize;
  final bool darkTone;
  final LiteMoovLogoLayout layout;

  const LiteMoovLogo({
    super.key,
    this.markSize = 32,
    this.showWordmark = true,
    this.wordmarkSize = 22,
    this.darkTone = true,
    this.layout = LiteMoovLogoLayout.horizontal,
  });

  const LiteMoovLogo.stacked({
    super.key,
    this.markSize = 72,
    this.showWordmark = true,
    this.wordmarkSize = 28,
    this.darkTone = true,
  }) : layout = LiteMoovLogoLayout.stacked;

  @override
  Widget build(BuildContext context) {
    final mark = LiteMoovMark(size: markSize);

    if (!showWordmark) return mark;

    if (layout == LiteMoovLogoLayout.stacked) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          mark,
          SizedBox(height: markSize * 0.22),
          LiteMoovWordmark(size: wordmarkSize, darkTone: darkTone),
        ],
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        mark,
        SizedBox(width: markSize * 0.28),
        LiteMoovWordmark(size: wordmarkSize, darkTone: darkTone),
      ],
    );
  }
}

class LiteMoovWordmark extends StatelessWidget {
  final double size;
  final bool darkTone;

  const LiteMoovWordmark({
    super.key,
    this.size = 20,
    this.darkTone = true,
  });

  @override
  Widget build(BuildContext context) {
    final liteColor = darkTone ? AppTheme.textPrimary : const Color(0xFF0B1220);

    return RichText(
      textAlign: TextAlign.center,
      text: TextSpan(
        style: TextStyle(
          fontSize: size,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.6,
          height: 1,
        ),
        children: [
          TextSpan(text: 'Lite', style: TextStyle(color: liteColor)),
          const TextSpan(text: 'm', style: TextStyle(color: Color(0xFF9333EA))),
          const TextSpan(text: 'o', style: TextStyle(color: Color(0xFF4F46E5))),
          const TextSpan(text: 'o', style: TextStyle(color: Color(0xFF3B82F6))),
          const TextSpan(text: 'v', style: TextStyle(color: Color(0xFF38BDF8))),
        ],
      ),
    );
  }
}

class LiteMoovMark extends StatelessWidget {
  final double size;

  const LiteMoovMark({super.key, this.size = 28});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size * 0.22),
        child: SvgPicture.asset(
          'assets/icons/lion-mark.svg',
          width: size,
          height: size,
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}
