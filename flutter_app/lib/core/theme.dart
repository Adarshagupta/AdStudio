import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppTheme {
  // Minimal neutral palette — no gradients.
  static const Color accent = Color(0xFFFAFAFA);
  static const Color onAccent = Color(0xFF0A0A0A);
  static const Color accentSoft = Color(0xFFE5E5E5);
  static const Color background = Color(0xFF0A0A0A);
  static const Color surface = Color(0xFF111111);
  static const Color surfaceElevated = Color(0xFF1A1A1A);
  static const Color border = Color(0xFF2A2A2A);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
  static const Color error = Color(0xFFEF4444);
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);

  static const double radiusSm = 10;
  static const double radiusMd = 14;
  static const double radiusLg = 18;

  /// Flat card — single surface color, hairline border.
  static BoxDecoration cardDecoration({double radius = radiusLg}) =>
      BoxDecoration(
        color: surfaceElevated,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: border),
      );

  /// Segmented filter / ratio chip.
  static BoxDecoration chipDecoration({required bool selected}) => BoxDecoration(
        color: selected ? surfaceElevated : Colors.transparent,
        borderRadius: BorderRadius.circular(radiusSm),
        border: Border.all(
          color: selected ? textPrimary : border,
          width: selected ? 1.5 : 1,
        ),
      );

  static TextStyle chipTextStyle({required bool selected}) => TextStyle(
        color: selected ? textPrimary : textSecondary,
        fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
        fontSize: 13,
      );

  static ThemeData get darkTheme {
    const scheme = ColorScheme.dark(
      primary: accent,
      onPrimary: onAccent,
      secondary: accentSoft,
      surface: surface,
      error: error,
      onSecondary: onAccent,
      onSurface: textPrimary,
      onError: Colors.white,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      appBarTheme: const AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: textPrimary,
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceElevated,
        hintStyle: const TextStyle(color: textMuted, fontSize: 15),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: textSecondary, width: 1.5),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          backgroundColor: accent,
          foregroundColor: onAccent,
          disabledBackgroundColor: surfaceElevated,
          disabledForegroundColor: textMuted,
          minimumSize: const Size.fromHeight(50),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMd),
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.2,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: textSecondary,
          textStyle: const TextStyle(fontWeight: FontWeight.w500),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: surfaceElevated,
        contentTextStyle: const TextStyle(color: textPrimary, fontSize: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          side: const BorderSide(color: border),
        ),
      ),
      dividerColor: border,
    );
  }
}
