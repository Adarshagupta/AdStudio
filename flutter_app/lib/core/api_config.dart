import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Backend URLs — keep in sync with `src/lib/site.ts` on the web app.
class ApiConfig {
  static const String productionOrigin = 'https://www.litemoov.com';
  static const String productionApiUrl = '$productionOrigin/api';

  /// Active API base URL including the `/api` suffix.
  static String get apiBaseUrl => _resolveApiBaseUrl();

  /// App origin without `/api` (QR payloads, asset URLs, etc.).
  static String get appOrigin {
    final url = apiBaseUrl;
    if (url.endsWith('/api')) {
      return url.substring(0, url.length - 4);
    }
    return url;
  }

  static bool get isProduction => apiBaseUrl == productionApiUrl;

  static String _resolveApiBaseUrl() {
    const fromDefine = String.fromEnvironment('API_BASE_URL');
    if (fromDefine.isNotEmpty) {
      return _normalizeApiUrl(fromDefine);
    }

    if (kReleaseMode) {
      return productionApiUrl;
    }

    final envFlag = dotenv.env['API_ENV']?.trim().toLowerCase();
    if (envFlag == 'production' || envFlag == 'prod') {
      return productionApiUrl;
    }

    final fromEnv = dotenv.env['API_BASE_URL']?.trim();
    if (fromEnv != null && fromEnv.isNotEmpty) {
      return _normalizeApiUrl(fromEnv);
    }

    return productionApiUrl;
  }

  static String _normalizeApiUrl(String url) {
    var value = url.trim().replaceAll(RegExp(r'/+$'), '');
    if (!value.endsWith('/api')) {
      value = '$value/api';
    }
    return value;
  }
}
