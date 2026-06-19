import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../models/generation.dart';
import '../services/api_service.dart';

typedef CreditsRefreshCallback = Future<void> Function({int? creditsRemaining});

class GenerationProvider extends ChangeNotifier {
  final ApiService _apiService;
  final CreditsRefreshCallback? _onCreditsChanged;

  List<Generation> _generations = [];
  bool _isLoading = false;
  bool _isGenerating = false;
  String? _error;
  int _currentPage = 1;
  bool _hasMore = true;
  int _total = 0;
  final Set<String> _pollingJobIds = {};

  GenerationProvider(this._apiService, {CreditsRefreshCallback? onCreditsChanged})
      : _onCreditsChanged = onCreditsChanged;

  List<Generation> get generations => _generations;
  List<Generation> get feedItems => _generations
      .where(
        (g) =>
            g.hasPlayableVideo ||
            g.previewImage != null ||
            (g.isProcessing && (g.isVideo || g.outputType == 'video')),
      )
      .toList();
  bool get isLoading => _isLoading;
  bool get isGenerating => _isGenerating;
  String? get error => _error;
  bool get hasMore => _hasMore;
  int get processingCount => _generations.where((g) => g.isProcessing).length;

  Future<void> loadGenerations({bool refresh = false}) async {
    if (refresh) {
      _currentPage = 1;
      _hasMore = true;
    }
    if (!_hasMore && !refresh) return;

    try {
      _isLoading = true;
      notifyListeners();

      final data = await _apiService.getGenerations(
        page: _currentPage,
        pageSize: 20,
      );

      final items = (data['items'] as List<dynamic>? ?? [])
          .map((e) => Generation.fromJson(e as Map<String, dynamic>))
          .toList();

      _total = data['total'] as int? ?? items.length;

      if (refresh) {
        _generations = items;
      } else {
        _generations = [..._generations, ...items];
      }

      _hasMore = _generations.length < _total;
      if (items.isNotEmpty) _currentPage++;
      _error = null;

      _resumePollingForProcessingJobs();
    } catch (e) {
      _error = _formatError(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Generation?> generateUgcVideo({
    required String prompt,
    String? productUrl,
    String aspectRatio = '9:16',
  }) async {
    if (prompt.trim().length < 3) {
      _error = 'Add a prompt with at least 3 characters.';
      notifyListeners();
      return null;
    }

    try {
      _isGenerating = true;
      _error = null;
      notifyListeners();

      final payload = Generation(
        id: '',
        title: prompt,
      ).toGeneratePayload(
        prompt: prompt,
        productUrl: productUrl,
        aspectRatio: aspectRatio,
      );

      final result = await _apiService.startGeneration(payload);
      await _applyCreditsFromResponse(result);

      final jobId =
          result['jobId'] as String? ?? result['generationId'] as String?;
      if (jobId == null || jobId.isEmpty) {
        throw Exception('Generation did not return a job id.');
      }

      final startStatus = result['status'] as String?;
      final startVideoUrl = result['videoUrl'] as String?;

      if (startStatus == 'COMPLETED' && startVideoUrl != null && startVideoUrl.isNotEmpty) {
        await loadGenerations(refresh: true);
        return Generation.fromJson({...result, 'id': jobId});
      }

      if (startStatus == 'FAILED') {
        throw Exception(
          result['error'] as String? ?? result['errorMessage'] as String? ?? 'Generation failed.',
        );
      }

      // Show in-progress job immediately in library/feed.
      final pending = Generation.fromJson({...result, 'id': jobId, 'prompt': prompt});
      _generations = [
        pending,
        ..._generations.where((g) => g.id != jobId),
      ];
      notifyListeners();

      final completed = await _pollUntilDone(jobId);
      await loadGenerations(refresh: true);
      await _onCreditsChanged?.call();
      return completed;
    } catch (e) {
      _error = _formatError(e);
      await _onCreditsChanged?.call();
      return null;
    } finally {
      _isGenerating = false;
      notifyListeners();
    }
  }

  Future<Generation?> _pollUntilDone(String jobId) async {
    const maxAttempts = 240;
    const intervalMs = 5000;
    var transientErrors = 0;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await Future.delayed(const Duration(milliseconds: intervalMs));
      }

      Map<String, dynamic> status;
      try {
        status = await _apiService.getGenerationStatus(jobId);
        transientErrors = 0;
      } on DioException catch (e) {
        if (_isTransientPollError(e) && transientErrors < 18) {
          transientErrors++;
          continue;
        }
        rethrow;
      }

      final generation = Generation.fromJson(status);
      _upsertGeneration(generation);

      if (generation.isFailed) {
        throw Exception(generation.errorMessage ?? 'Generation failed.');
      }

      if (generation.isCompleted) {
        if (generation.isVideo && !generation.hasPlayableVideo) {
          continue;
        }
        return generation;
      }
    }

    throw Exception('Timed out waiting for generation. Check your library soon.');
  }

  void _resumePollingForProcessingJobs() {
    for (final job in _generations.where((g) => g.isProcessing)) {
      if (_pollingJobIds.contains(job.id)) continue;
      _pollingJobIds.add(job.id);
      _pollJobInBackground(job.id);
    }
  }

  Future<void> _pollJobInBackground(String jobId) async {
    try {
      await _pollUntilDone(jobId);
      await loadGenerations(refresh: true);
      await _onCreditsChanged?.call();
    } catch (_) {
      await loadGenerations(refresh: true);
    } finally {
      _pollingJobIds.remove(jobId);
    }
  }

  void _upsertGeneration(Generation generation) {
    if (generation.id.isEmpty) return;
    final index = _generations.indexWhere((g) => g.id == generation.id);
    if (index >= 0) {
      _generations[index] = generation;
    } else {
      _generations = [generation, ..._generations];
    }
    notifyListeners();
  }

  Future<void> _applyCreditsFromResponse(Map<String, dynamic> result) async {
    final credits = result['creditsRemaining'];
    if (credits is int) {
      await _onCreditsChanged?.call(creditsRemaining: credits);
    } else {
      await _onCreditsChanged?.call();
    }
  }

  bool _isTransientPollError(DioException error) {
    final status = error.response?.statusCode;
    return status == null ||
        status == 408 ||
        status == 425 ||
        status == 429 ||
        status >= 500;
  }

  String _formatError(Object error) {
    if (error is DioException) {
      return ApiService.messageFromDioException(error);
    }
    if (error is Exception) {
      return error.toString().replaceFirst('Exception: ', '');
    }
    return error.toString();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
