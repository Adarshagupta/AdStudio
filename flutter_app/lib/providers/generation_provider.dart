import 'package:flutter/material.dart';
import '../models/generation.dart';
import '../services/api_service.dart';

class GenerationProvider extends ChangeNotifier {
  final ApiService _apiService;
  
  List<Generation> _generations = [];
  Generation? _currentGeneration;
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  bool _hasMore = true;

  GenerationProvider(this._apiService);

  List<Generation> get generations => _generations;
  Generation? get currentGeneration => _currentGeneration;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMore => _hasMore;

  Future<void> loadGenerations({bool refresh = false}) async {
    if (refresh) {
      _currentPage = 1;
      _generations = [];
      _hasMore = true;
    }
    
    if (!_hasMore && !refresh) return;

    try {
      _isLoading = true;
      notifyListeners();
      
      final data = await _apiService.getGenerations();
      final newGenerations = data.map((e) => Generation.fromJson(e as Map<String, dynamic>)).toList();
      
      if (refresh) {
        _generations = newGenerations;
      } else {
        _generations.addAll(newGenerations);
      }
      
      _hasMore = newGenerations.length >= 20;
      _currentPage++;
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadGeneration(String id) async {
    try {
      _isLoading = true;
      notifyListeners();
      
      final data = await _apiService.getGeneration(id);
      _currentGeneration = Generation.fromJson(data);
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> startGeneration({
    required String outputType,
    required String format,
    required String prompt,
    String? productUrl,
    String? referenceImageUrl,
    String? referenceVideoUrl,
    String? aspectRatio,
    String? videoOperation,
    bool? adhereToScript,
  }) async {
    try {
      _isLoading = true;
      notifyListeners();
      
      final data = await _apiService.startGeneration({
        'outputType': outputType,
        'format': format,
        'prompt': prompt,
        if (productUrl != null) 'productUrl': productUrl,
        if (referenceImageUrl != null) 'referenceImageUrl': referenceImageUrl,
        if (referenceVideoUrl != null) 'referenceVideoUrl': referenceVideoUrl,
        if (aspectRatio != null) 'aspectRatio': aspectRatio,
        if (videoOperation != null) 'videoOperation': videoOperation,
        if (adhereToScript != null) 'adhereToScript': adhereToScript,
      });
      
      _error = null;
      return data;
    } catch (e) {
      _error = e.toString();
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> pollGenerationStatus(String jobId) async {
    try {
      final data = await _apiService.getGenerationStatus(jobId);
      return data;
    } catch (e) {
      return null;
    }
  }

  Future<bool> generateImage(String prompt, {
    String? productUrl,
    String? referenceImageUrl,
    String aspectRatio = '9:16',
  }) async {
    final result = await startGeneration(
      outputType: 'image',
      format: 'STATIC',
      prompt: prompt,
      productUrl: productUrl,
      referenceImageUrl: referenceImageUrl,
      aspectRatio: aspectRatio,
    );
    return result != null;
  }

  Future<bool> generateVideo(String prompt, {
    String? productUrl,
    String? referenceImageUrl,
    String? referenceVideoUrl,
    String aspectRatio = '9:16',
    String videoOperation = 'auto',
    bool adhereToScript = false,
  }) async {
    final result = await startGeneration(
      outputType: 'video',
      format: 'UGC',
      prompt: prompt,
      productUrl: productUrl,
      referenceImageUrl: referenceImageUrl,
      referenceVideoUrl: referenceVideoUrl,
      aspectRatio: aspectRatio,
      videoOperation: videoOperation,
      adhereToScript: adhereToScript,
    );
    return result != null;
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearCurrentGeneration() {
    _currentGeneration = null;
    notifyListeners();
  }
}
