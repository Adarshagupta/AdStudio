import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

class QrScanScreen extends StatefulWidget {
  final String mode;

  const QrScanScreen({super.key, this.mode = 'auto'});

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );
  bool _processing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Map<String, dynamic>? _parsePayload(String raw) {
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) return null;
      if (decoded['v'] != 1) return null;
      if (decoded['sid'] is! String ||
          decoded['sec'] is! String ||
          decoded['sig'] is! String) {
        return null;
      }
      return decoded;
    } catch (_) {
      return null;
    }
  }

  Future<void> _handlePayload(Map<String, dynamic> payload) async {
    if (_processing) return;
    setState(() => _processing = true);

    final auth = context.read<AuthProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final intent = payload['intent'] as String? ?? '';

    try {
      if (intent == 'mobile_login') {
        final ok = await auth.loginWithQr(
          sessionId: payload['sid'] as String,
          secret: payload['sec'] as String,
          signature: payload['sig'] as String,
        );
        if (!mounted) return;
        if (ok) {
          context.go(auth.onboardingComplete ? '/feed' : '/onboarding');
          return;
        }
        messenger.showSnackBar(
          SnackBar(content: Text(auth.error ?? 'QR sign-in failed')),
        );
        await _controller.start();
      } else if (intent == 'web_login') {
        if (!auth.isAuthenticated) {
          messenger.showSnackBar(
            const SnackBar(
              content: Text(
                'Sign in on the app first, then scan to approve web login.',
              ),
            ),
          );
          await _controller.start();
          return;
        }
        final ok = await auth.approveWebLogin(
          sessionId: payload['sid'] as String,
          secret: payload['sec'] as String,
          signature: payload['sig'] as String,
        );
        if (!mounted) return;
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              ok ? 'Web login approved.' : (auth.error ?? 'Could not approve login.'),
            ),
          ),
        );
        if (ok) {
          context.pop();
        } else {
          await _controller.start();
        }
      } else {
        messenger.showSnackBar(
          const SnackBar(content: Text('Unsupported QR code.')),
        );
        await _controller.start();
      }
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  void _onDetect(BarcodeCapture capture) {
    if (_processing) return;
    for (final barcode in capture.barcodes) {
      final raw = barcode.rawValue;
      if (raw == null || raw.isEmpty) continue;
      final payload = _parsePayload(raw);
      if (payload == null) continue;
      _controller.stop();
      _handlePayload(payload);
      return;
    }
  }

  String get _title {
    if (widget.mode == 'login') return 'Scan to sign in';
    if (widget.mode == 'approve') return 'Approve web login';
    return 'Scan QR code';
  }

  String get _subtitle {
    if (widget.mode == 'login') {
      return 'Open litemoov.com → Settings → Profile and scan the mobile login QR.';
    }
    if (widget.mode == 'approve') {
      return 'Scan the QR code shown on the website login page.';
    }
    return 'Scan a LiteMoov login QR from the website.';
  }

  Widget _buildPermissionPrompt(MobileScannerException error) {
    final denied = error.errorCode == MobileScannerErrorCode.permissionDenied;

    return Container(
      color: AppTheme.background,
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppTheme.surfaceElevated,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.border),
            ),
            child: const Icon(
              Icons.camera_alt_outlined,
              color: AppTheme.textSecondary,
              size: 32,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Camera access needed',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            denied
                ? 'Allow camera access when prompted so LiteMoov can scan QR codes.'
                : (error.errorDetails?.message ?? 'Could not open the camera.'),
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 14,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => _controller.start(),
              child: const Text('Allow camera & scan'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        title: Text(
          _title,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Text(
              _subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 14,
                height: 1.45,
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    MobileScanner(
                      controller: _controller,
                      onDetect: _onDetect,
                      errorBuilder: (context, error, child) =>
                          _buildPermissionPrompt(error),
                    ),
                    if (_processing)
                      Container(
                        color: Colors.black54,
                        alignment: Alignment.center,
                        child: const CircularProgressIndicator(
                          color: AppTheme.textPrimary,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
