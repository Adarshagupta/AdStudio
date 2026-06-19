import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'providers/auth_provider.dart';
import 'providers/generation_provider.dart';
import 'providers/onboarding_provider.dart';
import 'services/api_service.dart';
import 'core/router.dart';
import 'core/theme.dart';
import 'core/api_config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // Optional .env — release builds and missing .env use production API.
  }

  if (kDebugMode) {
    debugPrint('LiteMoov API: ${ApiConfig.apiBaseUrl}');
  }

  final apiService = ApiService();
  await apiService.init();

  runApp(LiteMoovApp(apiService: apiService));
}

class LiteMoovApp extends StatefulWidget {
  final ApiService apiService;

  const LiteMoovApp({super.key, required this.apiService});

  @override
  State<LiteMoovApp> createState() => _LiteMoovAppState();
}

class _LiteMoovAppState extends State<LiteMoovApp> {
  late final RouterRefreshNotifier _routerRefresh;
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _routerRefresh = RouterRefreshNotifier();
    _router = AppRouter.create(_routerRefresh);
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider.value(value: widget.apiService),
        ChangeNotifierProvider(
          create: (_) {
            final auth = AuthProvider(widget.apiService);
            auth.addListener(_routerRefresh.refresh);
            return auth;
          },
        ),
        ChangeNotifierProvider(
          create: (_) => OnboardingProvider(widget.apiService),
        ),
        ChangeNotifierProvider(
          create: (ctx) => GenerationProvider(
            ctx.read<ApiService>(),
            onCreditsChanged: ({int? creditsRemaining}) async {
              final auth = ctx.read<AuthProvider>();
              if (creditsRemaining != null) {
                auth.updateCreditsRemaining(creditsRemaining);
              }
              await auth.refreshWorkspace();
            },
          ),
        ),
      ],
      child: MaterialApp.router(
        title: 'LiteMoov',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        themeMode: ThemeMode.dark,
        routerConfig: _router,
      ),
    );
  }
}
