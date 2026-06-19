import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService;

  User? _user;
  Workspace? _workspace;
  bool _isLoading = true;
  bool _isBusy = false;
  String? _error;
  bool _isAuthenticated = false;
  bool _onboardingComplete = false;

  AuthProvider(this._apiService) {
    _bootstrap();
  }

  User? get user => _user;
  Workspace? get workspace => _workspace;
  bool get isLoading => _isLoading;
  bool get isBusy => _isBusy;
  String? get error => _error;
  bool get isAuthenticated => _isAuthenticated;
  bool get onboardingComplete => _onboardingComplete;

  Future<void> _bootstrap() async {
    if (_apiService.sessionToken == null) {
      _isLoading = false;
      _isAuthenticated = false;
      notifyListeners();
      return;
    }

    await restoreSession();
  }

  Future<void> restoreSession() async {
    try {
      _isLoading = true;
      notifyListeners();

      final userData = await _apiService.getCurrentUser();
      _applyUserPayload(userData);

      try {
        final onboarding = await _apiService.getOnboarding();
        _onboardingComplete = onboarding['completed'] as bool? ?? false;
      } catch (_) {
        // Onboarding fetch failing should not sign the user out.
        final cached = _apiService.loadAuthSnapshot();
        _onboardingComplete =
            cached?.onboardingComplete ?? _onboardingComplete;
      }

      await _apiService.saveAuthSnapshot(userData, _onboardingComplete);
      _isAuthenticated = true;
      _error = null;
    } catch (e) {
      if (e is DioException && ApiService.isSessionInvalid(e)) {
        await _clearAuthenticatedState();
      } else {
        await _restoreFromLocalSession();
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Keeps the user signed in using the stored token + cached profile when
  /// the backend is unreachable (common on mobile / local dev IP changes).
  Future<void> _restoreFromLocalSession() async {
    if (_apiService.sessionToken == null) {
      _isAuthenticated = false;
      return;
    }

    final cached = _apiService.loadAuthSnapshot();
    if (cached != null) {
      _applyUserPayload(cached.user);
      _onboardingComplete = cached.onboardingComplete;
    } else {
      // Token exists but no snapshot yet — still treat as signed in.
      _onboardingComplete = true;
    }

    _isAuthenticated = true;
    _error = null;
  }

  Future<void> _clearAuthenticatedState() async {
    _isAuthenticated = false;
    _user = null;
    _workspace = null;
    _onboardingComplete = false;
    await _apiService.clearSessionToken();
    await _apiService.clearAuthSnapshot();
  }

  void _applyUserPayload(Map<String, dynamic> userData) {
    _user = User.fromJson(userData);
    final workspaceJson = userData['workspace'] as Map<String, dynamic>?;
    if (workspaceJson != null) {
      _workspace = Workspace.fromJson(workspaceJson);
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      _isBusy = true;
      _error = null;
      notifyListeners();

      final loginData = await _apiService.login(email, password);
      _onboardingComplete = loginData['onboardingComplete'] as bool? ?? false;

      final userData = await _apiService.getCurrentUser();
      _applyUserPayload(userData);

      if (!_onboardingComplete) {
        try {
          final onboarding = await _apiService.getOnboarding();
          _onboardingComplete = onboarding['completed'] as bool? ?? false;
        } catch (_) {}
      }

      _isAuthenticated = true;
      await _apiService.saveAuthSnapshot(userData, _onboardingComplete);
      return true;
    } catch (e) {
      _error = _formatError(e);
      _isAuthenticated = false;
      return false;
    } finally {
      _isBusy = false;
      notifyListeners();
    }
  }

  Future<bool> signup({
    required String email,
    required String password,
    required String name,
    required String workspaceName,
  }) async {
    try {
      _isBusy = true;
      _error = null;
      notifyListeners();

      await _apiService.signup(
        email: email,
        password: password,
        name: name,
        workspaceName: workspaceName,
      );

      _error =
          'Account created. Check your email to verify, then sign in.';
      return false;
    } catch (e) {
      _error = _formatError(e);
      return false;
    } finally {
      _isBusy = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _apiService.logout();
    await _apiService.clearAuthSnapshot();
    _user = null;
    _workspace = null;
    _isAuthenticated = false;
    _onboardingComplete = false;
    _error = null;
    notifyListeners();
  }

  Future<bool> forgotPassword(String email) async {
    try {
      _isBusy = true;
      notifyListeners();
      await _apiService.forgotPassword(email);
      _error = null;
      return true;
    } catch (e) {
      _error = _formatError(e);
      return false;
    } finally {
      _isBusy = false;
      notifyListeners();
    }
  }

  Future<bool> loginWithQr({
    required String sessionId,
    required String secret,
    required String signature,
  }) async {
    try {
      _isBusy = true;
      _error = null;
      notifyListeners();

      final data = await _apiService.consumeQrLogin(
        sessionId: sessionId,
        secret: secret,
        signature: signature,
      );

      final token = data['token'] as String?;
      if (token == null || token.isEmpty) {
        throw Exception('QR login did not return a session.');
      }

      _onboardingComplete = data['onboardingComplete'] as bool? ?? false;
      final userData = await _apiService.getCurrentUser();
      _applyUserPayload(userData);
      _isAuthenticated = true;
      await _apiService.saveAuthSnapshot(userData, _onboardingComplete);
      return true;
    } catch (e) {
      _error = _formatError(e);
      return false;
    } finally {
      _isBusy = false;
      notifyListeners();
    }
  }

  Future<bool> approveWebLogin({
    required String sessionId,
    required String secret,
    required String signature,
  }) async {
    try {
      _isBusy = true;
      _error = null;
      notifyListeners();

      await _apiService.approveQrLogin(
        sessionId: sessionId,
        secret: secret,
        signature: signature,
      );
      return true;
    } catch (e) {
      _error = _formatError(e);
      return false;
    } finally {
      _isBusy = false;
      notifyListeners();
    }
  }

  void markOnboardingComplete() {
    _onboardingComplete = true;
    notifyListeners();
    if (_user != null) {
      _apiService.saveAuthSnapshot(
        {
          ..._user!.toJson(),
          if (_workspace != null) 'workspace': _workspace!.toJson(),
        },
        true,
      );
    }
  }

  Future<void> refreshWorkspace() async {
    if (!_isAuthenticated) return;
    try {
      final userData = await _apiService.getCurrentUser();
      _applyUserPayload(userData);
      await _apiService.saveAuthSnapshot(userData, _onboardingComplete);
      notifyListeners();
    } catch (_) {}
  }

  void updateCreditsRemaining(int credits) {
    if (_workspace == null) return;
    _workspace = Workspace(
      id: _workspace!.id,
      name: _workspace!.name,
      slug: _workspace!.slug,
      plan: _workspace!.plan,
      creditsRemaining: credits,
      avatarUrl: _workspace!.avatarUrl,
      createdAt: _workspace!.createdAt,
      updatedAt: _workspace!.updatedAt,
    );
    notifyListeners();
  }

  String _formatError(Object error) {
    if (error is DioException) {
      return ApiService.messageFromDioException(error);
    }
    return error.toString();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
