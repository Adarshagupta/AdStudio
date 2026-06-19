import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../models/onboarding.dart';
import '../services/api_service.dart';

class OnboardingProvider extends ChangeNotifier {
  final ApiService _apiService;

  OnboardingState? _state;
  bool _isLoading = false;
  bool _isSaving = false;
  String? _error;

  String companyName = '';
  String? companySize;
  String? monthlyAdSpend;
  String? hearAboutSource;
  String hearAboutOther = '';

  OnboardingProvider(this._apiService);

  OnboardingState? get state => _state;
  bool get isLoading => _isLoading;
  bool get isSaving => _isSaving;
  String? get error => _error;

  Future<void> load() async {
    try {
      _isLoading = true;
      notifyListeners();

      final data = await _apiService.getOnboarding();
      _state = OnboardingState.fromJson(data);

      companyName = _state!.companyName ?? _state!.workspaceName;
      companySize = _state!.companySize;
      monthlyAdSpend = _state!.monthlyAdSpend;
      hearAboutSource = _state!.hearAboutSource;
      hearAboutOther = _state!.hearAboutOther ?? '';
      _error = null;
    } catch (e) {
      _error = _formatError(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> saveProgress() async {
    try {
      _isSaving = true;
      notifyListeners();

      final data = await _apiService.saveOnboarding(_buildPayload(complete: false));
      _state = OnboardingState.fromJson(data);
      _error = null;
      return true;
    } catch (e) {
      _error = _formatError(e);
      return false;
    } finally {
      _isSaving = false;
      notifyListeners();
    }
  }

  Future<bool> complete() async {
    try {
      _isSaving = true;
      notifyListeners();

      final data = await _apiService.saveOnboarding(_buildPayload(complete: true));
      _state = OnboardingState.fromJson(data);

      try {
        await _apiService.claimWelcomeCredits();
      } catch (_) {}

      _error = null;
      return _state!.completed;
    } catch (e) {
      _error = _formatError(e);
      return false;
    } finally {
      _isSaving = false;
      notifyListeners();
    }
  }

  Map<String, dynamic> _buildPayload({required bool complete}) {
    return {
      'companyName': companyName.trim(),
      if (companySize != null) 'companySize': companySize,
      if (monthlyAdSpend != null) 'monthlyAdSpend': monthlyAdSpend,
      if (hearAboutSource != null) 'hearAboutSource': hearAboutSource,
      if (hearAboutSource == 'other' && hearAboutOther.trim().isNotEmpty)
        'hearAboutOther': hearAboutOther.trim(),
      if (complete) 'complete': true,
    };
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  String _formatError(Object error) {
    if (error is DioException) {
      return ApiService.messageFromDioException(error);
    }
    return error.toString();
  }
}
