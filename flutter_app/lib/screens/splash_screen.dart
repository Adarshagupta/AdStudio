import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../core/theme.dart';
import '../widgets/litemoov_logo.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _routeWhenReady());
  }

  Future<void> _routeWhenReady() async {
    final auth = context.read<AuthProvider>();

    while (auth.isLoading) {
      await Future.delayed(const Duration(milliseconds: 100));
      if (!mounted) return;
    }

    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;

    if (!auth.isAuthenticated) {
      context.go('/login');
      return;
    }

    if (!auth.onboardingComplete) {
      context.go('/onboarding');
      return;
    }

    context.go('/feed');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            const LiteMoovLogo.stacked(
              markSize: 80,
              wordmarkSize: 30,
            ),
            const SizedBox(height: 40),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppTheme.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
