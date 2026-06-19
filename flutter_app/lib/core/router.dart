import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../models/generation.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/forgot_password_screen.dart';
import '../screens/auth/qr_scan_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/signup_screen.dart';
import '../screens/feed/feed_screen.dart';
import '../screens/generation/generation_detail_screen.dart';
import '../screens/library/library_screen.dart';
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/shell/main_shell.dart';
import '../screens/splash_screen.dart';

class RouterRefreshNotifier extends ChangeNotifier {
  void refresh() => notifyListeners();
}

class AppRouter {
  static final _rootKey = GlobalKey<NavigatorState>();
  static final _shellKey = GlobalKey<NavigatorState>();

  static GoRouter create(RouterRefreshNotifier refresh) => GoRouter(
        navigatorKey: _rootKey,
        initialLocation: '/',
        refreshListenable: refresh,
        redirect: (context, state) {
          final auth = Provider.of<AuthProvider>(context, listen: false);
          final path = state.matchedLocation;

          if (auth.isLoading) {
            return path == '/' ? null : '/';
          }

          final isAuthRoute = path == '/login' ||
              path == '/signup' ||
              path == '/forgot-password';

          if (!auth.isAuthenticated) {
            if (path == '/' || isAuthRoute || path == '/qr-scan') return null;
            return '/login';
          }

          if (!auth.onboardingComplete && path != '/onboarding') {
            return '/onboarding';
          }

          if (auth.onboardingComplete &&
              (isAuthRoute || path == '/onboarding' || path == '/')) {
            return '/feed';
          }

          return null;
        },
        routes: [
          GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
          GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
          GoRoute(
            path: '/qr-scan',
            builder: (_, state) => QrScanScreen(
              mode: state.uri.queryParameters['mode'] ?? 'auto',
            ),
          ),
          GoRoute(path: '/signup', builder: (_, __) => const SignupScreen()),
          GoRoute(
            path: '/forgot-password',
            builder: (_, __) => const ForgotPasswordScreen(),
          ),
          GoRoute(
            path: '/onboarding',
            builder: (_, __) => const OnboardingScreen(),
          ),
          GoRoute(
            path: '/generation',
            parentNavigatorKey: _rootKey,
            builder: (_, state) =>
                GenerationDetailScreen(generation: state.extra as Generation),
          ),
          StatefulShellRoute.indexedStack(
            builder: (_, __, navigationShell) =>
                MainShell(navigationShell: navigationShell),
            branches: [
              StatefulShellBranch(
                navigatorKey: _shellKey,
                routes: [
                  GoRoute(path: '/feed', builder: (_, __) => const FeedScreen()),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: '/library',
                    builder: (_, __) => const LibraryScreen(),
                  ),
                ],
              ),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: '/profile',
                    builder: (_, __) => const ProfileScreen(),
                  ),
                ],
              ),
            ],
          ),
        ],
      );
}
