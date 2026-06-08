import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService;
  
  User? _user;
  Workspace? _workspace;
  bool _isLoading = false;
  String? _error;
  bool _isAuthenticated = false;

  AuthProvider(this._apiService) {
    _checkAuth();
  }

  User? get user => _user;
  Workspace? get workspace => _workspace;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _isAuthenticated;

  Future<void> _checkAuth() async {
    if (_apiService.sessionToken == null) {
      _isAuthenticated = false;
      notifyListeners();
      return;
    }
    
    try {
      _isLoading = true;
      notifyListeners();
      
      final userData = await _apiService.getCurrentUser();
      _user = User.fromJson(userData);
      
      final workspaceData = await _apiService.getWorkspace();
      _workspace = Workspace.fromJson(workspaceData);
      
      _isAuthenticated = true;
      _error = null;
    } catch (e) {
      _isAuthenticated = false;
      _error = _formatError(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();
      
      await _apiService.login(email, password);
      
      final userData = await _apiService.getCurrentUser();
      _user = User.fromJson(userData);
      
      final workspaceData = await _apiService.getWorkspace();
      _workspace = Workspace.fromJson(workspaceData);
      
      _isAuthenticated = true;
      _error = null;
      notifyListeners();
      return true;
    } catch (e) {
      _error = _formatError(e);
      _isAuthenticated = false;
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  String _formatError(Object error) {
    if (error is DioException) {
      return ApiService.messageFromDioException(error);
    }
    return error.toString();
  }

  Future<bool> signup(String email, String password, String? name) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();
      
      final signupResult = await _apiService.signup(email, password, name);

      if (signupResult['requiresVerification'] == true) {
        _error = 'Account created. Check your email to verify before signing in.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      return await login(email, password);
    } catch (e) {
      _error = _formatError(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _apiService.logout();
    } catch (e) {
      // Ignore logout errors
    } finally {
      _user = null;
      _workspace = null;
      _isAuthenticated = false;
      _error = null;
      notifyListeners();
    }
  }

  Future<bool> forgotPassword(String email) async {
    try {
      _isLoading = true;
      notifyListeners();
      
      await _apiService.forgotPassword(email);
      _error = null;
      return true;
    } catch (e) {
      _error = _formatError(e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshUser() async {
    if (!_isAuthenticated) return;
    
    try {
      final userData = await _apiService.getCurrentUser();
      _user = User.fromJson(userData);
      notifyListeners();
    } catch (e) {
      // Silently fail
    }
  }

  Future<void> refreshWorkspace() async {
    if (!_isAuthenticated) return;
    
    try {
      final workspaceData = await _apiService.getWorkspace();
      _workspace = Workspace.fromJson(workspaceData);
      notifyListeners();
    } catch (e) {
      // Silently fail
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
