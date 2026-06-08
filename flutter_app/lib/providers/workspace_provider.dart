import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class WorkspaceProvider extends ChangeNotifier {
  final ApiService _apiService;
  
  List<WorkspaceMember> _members = [];
  bool _isLoading = false;
  String? _error;
  int _creditsRemaining = 0;

  WorkspaceProvider(this._apiService);

  List<WorkspaceMember> get members => _members;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get creditsRemaining => _creditsRemaining;

  Future<void> loadMembers() async {
    try {
      _isLoading = true;
      notifyListeners();
      
      final data = await _apiService.getWorkspaceMembers();
      _members = data.map((e) => WorkspaceMember.fromJson(e as Map<String, dynamic>)).toList();
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadWorkspaceInfo() async {
    try {
      final data = await _apiService.getWorkspace();
      _creditsRemaining = data['creditsRemaining'] as int? ?? 0;
      notifyListeners();
    } catch (e) {
      // Silently fail
    }
  }

  Future<bool> claimCredits() async {
    try {
      _isLoading = true;
      notifyListeners();
      
      await _apiService.claimWelcomeCredits();
      await loadWorkspaceInfo();
      _error = null;
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateWorkspace(Map<String, dynamic> data) async {
    try {
      _isLoading = true;
      notifyListeners();
      
      await _apiService.updateWorkspace(data);
      _error = null;
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
