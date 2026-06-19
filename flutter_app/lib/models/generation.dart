import 'generation_style.dart';

class Generation {
  final String id;
  final String title;
  final String? format;
  final String? outputType;
  final String? status;
  final String? prompt;
  final String? videoUrl;
  final String? imageUrl;
  final String? thumbnailUrl;
  final String? timestamp;
  final int? durationSec;
  final String? errorMessage;

  Generation({
    required this.id,
    required this.title,
    this.format,
    this.outputType,
    this.status,
    this.prompt,
    this.videoUrl,
    this.imageUrl,
    this.thumbnailUrl,
    this.timestamp,
    this.durationSec,
    this.errorMessage,
  });

  factory Generation.fromJson(Map<String, dynamic> json) {
    final style = json['style'];
    final styleMap = style is Map<String, dynamic> ? style : null;

    final title = json['title'] as String? ??
        json['prompt'] as String? ??
        'Untitled';

    final outputType = json['outputType'] as String? ??
        styleMap?['outputType'] as String?;

    return Generation(
      id: json['id'] as String? ?? json['jobId'] as String? ?? json['generationId'] as String? ?? '',
      title: title,
      format: json['format'] as String? ?? json['type'] as String?,
      outputType: outputType,
      status: json['status'] as String?,
      prompt: json['prompt'] as String? ?? title,
      videoUrl: json['videoUrl'] as String?,
      imageUrl: json['imageUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      timestamp: json['timestamp'] as String? ?? json['createdAt'] as String?,
      durationSec: json['durationSec'] as int?,
      errorMessage: json['errorMessage'] as String? ?? json['error'] as String?,
    );
  }

  Generation copyWith({
    String? status,
    String? videoUrl,
    String? thumbnailUrl,
    String? imageUrl,
    String? errorMessage,
  }) {
    return Generation(
      id: id,
      title: title,
      format: format,
      outputType: outputType,
      status: status ?? this.status,
      prompt: prompt,
      videoUrl: videoUrl ?? this.videoUrl,
      imageUrl: imageUrl ?? this.imageUrl,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      timestamp: timestamp,
      durationSec: durationSec,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  bool get isCompleted => status == 'COMPLETED';
  bool get isFailed => status == 'FAILED';
  bool get isProcessing =>
      status == 'PROCESSING' || status == 'QUEUED' || status == 'PENDING';
  bool get isVideo =>
      outputType == 'video' || (videoUrl != null && videoUrl!.isNotEmpty);
  bool get hasPlayableVideo => videoUrl != null && videoUrl!.isNotEmpty;

  String? get previewImage {
    if (thumbnailUrl != null && thumbnailUrl!.isNotEmpty) return thumbnailUrl;
    if (imageUrl != null && imageUrl!.isNotEmpty) return imageUrl;
    return null;
  }

  String get statusLabel {
    switch (status) {
      case 'COMPLETED':
        return 'Ready';
      case 'FAILED':
        return 'Failed';
      case 'PROCESSING':
        return 'Processing';
      case 'QUEUED':
        return 'Queued';
      case 'PENDING':
        return 'Pending';
      default:
        return status ?? 'Draft';
    }
  }

  String get relativeTime {
    final raw = timestamp;
    if (raw == null || raw.isEmpty) return '';
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;

    final diff = DateTime.now().difference(parsed);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    if (diff.inDays < 30) return '${(diff.inDays / 7).floor()}w ago';
    if (diff.inDays < 365) return '${(diff.inDays / 30).floor()}mo ago';
    return '${(diff.inDays / 365).floor()}y ago';
  }

  /// Web-compatible POST /api/generate body for UGC video.
  Map<String, dynamic> toGeneratePayload({
    required String prompt,
    String? productUrl,
    String aspectRatio = '9:16',
  }) =>
      {
        'outputType': 'video',
        'format': 'UGC',
        'prompt': prompt.trim(),
        'productUrl': productUrl?.trim() ?? '',
        'avatarId': null,
        'scriptText': '',
        'adhereToScript': false,
        'shotNotes': '',
        'style': GenerationStyle.defaults(aspectRatio: aspectRatio),
      };
}
