import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api_config.dart';

class ApiService {
  late Dio _dio;
  late SharedPreferences _prefs;
  String? _sessionToken;

  static const String sessionCookieName = 'ugc_session';
  static const String _cachedUserKey = 'cached_user';
  static const String _cachedOnboardingKey = 'cached_onboarding_complete';

  static String get baseUrl => ApiConfig.appOrigin;

  static String get apiBaseUrl => ApiConfig.apiBaseUrl;

  static String messageFromDioException(DioException error) {
    final data = error.response?.data;
    if (data is Map) {
      final message = data['error'] ?? data['errorMessage'];
      if (message is String && message.trim().isNotEmpty) {
        return message;
      }
    }

    final status = error.response?.statusCode;
    if (status == 401) return 'Invalid email or password.';
    if (status == 403) return 'You do not have permission for this action.';
    if (status == 402) {
      return data is Map && data['error'] is String
          ? data['error'] as String
          : 'Insufficient credits. Upgrade your plan to continue.';
    }
    if (status == 400) return 'Invalid request. Check your details.';

    return error.message ?? 'Request failed.';
  }

  Dio get dio => _dio;
  String? get sessionToken => _sessionToken;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    _sessionToken = _prefs.getString('session_token');

    _dio = Dio(BaseOptions(
      baseUrl: apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 90),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_sessionToken != null) {
          options.headers['Authorization'] = 'Bearer $_sessionToken';
          options.headers['Cookie'] = '$sessionCookieName=$_sessionToken';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        if (kDebugMode) {
          print('API ${apiBaseUrl} ${e.response?.statusCode} ${e.requestOptions.path}');
        }
        return handler.next(e);
      },
    ));
  }

  Future<void> setSessionToken(String token) async {
    _sessionToken = token;
    await _prefs.setString('session_token', token);
  }

  Future<void> clearSessionToken() async {
    _sessionToken = null;
    await _prefs.remove('session_token');
  }

  /// Persists a snapshot of the signed-in user so the app can restore after
  /// restarts even when the backend is temporarily unreachable.
  Future<void> saveAuthSnapshot(
    Map<String, dynamic> userData,
    bool onboardingComplete,
  ) async {
    await _prefs.setString(_cachedUserKey, jsonEncode(userData));
    await _prefs.setBool(_cachedOnboardingKey, onboardingComplete);
  }

  ({Map<String, dynamic> user, bool onboardingComplete})? loadAuthSnapshot() {
    final raw = _prefs.getString(_cachedUserKey);
    if (raw == null || raw.isEmpty) return null;

    try {
      final user = jsonDecode(raw) as Map<String, dynamic>;
      return (
        user: user,
        onboardingComplete: _prefs.getBool(_cachedOnboardingKey) ?? false,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> clearAuthSnapshot() async {
    await _prefs.remove(_cachedUserKey);
    await _prefs.remove(_cachedOnboardingKey);
  }

  /// True when the server explicitly rejected the session (not a network blip).
  static bool isSessionInvalid(DioException error) {
    return error.response?.statusCode == 401;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email.trim().toLowerCase(),
      'password': password,
    });

    final data = response.data as Map<String, dynamic>;
    final token = data['token'] as String?;
    if (token != null && token.isNotEmpty) {
      await setSessionToken(token);
    }
    return data;
  }

  Future<Map<String, dynamic>> signup({
    required String email,
    required String password,
    required String name,
    required String workspaceName,
  }) async {
    final response = await _dio.post('/auth/signup', data: {
      'email': email.trim().toLowerCase(),
      'password': password,
      'name': name.trim(),
      'workspaceName': workspaceName.trim(),
    });
    return response.data as Map<String, dynamic>;
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } finally {
      await clearSessionToken();
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    final response = await _dio.post('/auth/forgot-password', data: {
      'email': email.trim().toLowerCase(),
    });
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    final response = await _dio.get('/auth/me');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> consumeQrLogin({
    required String sessionId,
    required String secret,
    required String signature,
  }) async {
    final response = await _dio.post('/auth/qr/consume', data: {
      'sessionId': sessionId,
      'secret': secret,
      'signature': signature,
    });
    final data = response.data as Map<String, dynamic>;
    final token = data['token'] as String?;
    if (token != null && token.isNotEmpty) {
      await setSessionToken(token);
    }
    return data;
  }

  Future<Map<String, dynamic>> approveQrLogin({
    required String sessionId,
    required String secret,
    required String signature,
  }) async {
    final response = await _dio.post('/auth/qr/approve', data: {
      'sessionId': sessionId,
      'secret': secret,
      'signature': signature,
    });
    return response.data as Map<String, dynamic>;
  }

  // ── Onboarding ───────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getOnboarding() async {
    final response = await _dio.get('/onboarding');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> saveOnboarding(Map<String, dynamic> data) async {
    final response = await _dio.post('/onboarding', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> claimWelcomeCredits() async {
    final response = await _dio.post('/workspace/claim-credits');
    return response.data as Map<String, dynamic>;
  }

  // ── Generations ──────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> startGeneration(Map<String, dynamic> data) async {
    final response = await _dio.post('/generate', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getGenerationStatus(String jobId) async {
    final response = await _dio.get(
      '/generate/$jobId/status',
      options: Options(
        receiveTimeout: const Duration(seconds: 120),
        headers: {'Cache-Control': 'no-store'},
      ),
    );
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getGenerations({
    int page = 1,
    int pageSize = 20,
  }) async {
    final response = await _dio.get('/generations', queryParameters: {
      'page': page,
      'pageSize': pageSize,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> uploadAsset(
    File file, {
    String kind = 'image',
  }) async {
    final formData = FormData.fromMap({
      'kind': kind,
      'file': await MultipartFile.fromFile(
        file.path,
        filename: file.path.split(Platform.pathSeparator).last,
      ),
    });
    final response = await _dio.post('/studio/upload', data: formData);
    return response.data as Map<String, dynamic>;
  }
}
