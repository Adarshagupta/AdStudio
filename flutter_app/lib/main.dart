import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'providers/auth_provider.dart';
import 'providers/chat_provider.dart';
import 'providers/generation_provider.dart';
import 'providers/workspace_provider.dart';
import 'services/api_service.dart';
import 'core/router.dart';
import 'core/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  
  final apiService = ApiService();
  await apiService.init();
  
  runApp(
    MultiProvider(
      providers: [
        Provider.value(value: apiService),
        ChangeNotifierProvider(
          create: (_) => AuthProvider(apiService),
        ),
        ChangeNotifierProvider(
          create: (_) => ChatProvider(apiService),
        ),
        ChangeNotifierProvider(
          create: (_) => GenerationProvider(apiService),
        ),
        ChangeNotifierProvider(
          create: (_) => WorkspaceProvider(apiService),
        ),
      ],
      child: const LiteMoovApp(),
    ),
  );
}

class LiteMoovApp extends StatelessWidget {
  const LiteMoovApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'LiteMoov',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.light,
      routerConfig: AppRouter.router,
    );
  }
}
