class Generation {
  final String id;
  final String? format;
  final String? status;
  final String? prompt;
  final String? scriptText;
  final String? videoUrl;
  final String? imageUrl;
  final String? thumbnailUrl;
  final String? xaiRequestId;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime? failedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  Generation({
    required this.id,
    this.format,
    this.status,
    this.prompt,
    this.scriptText,
    this.videoUrl,
    this.imageUrl,
    this.thumbnailUrl,
    this.xaiRequestId,
    this.startedAt,
    this.completedAt,
    this.failedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Generation.fromJson(Map<String, dynamic> json) => Generation(
    id: json['id'] as String,
    format: json['format'] as String?,
    status: json['status'] as String?,
    prompt: json['prompt'] as String?,
    scriptText: json['scriptText'] as String?,
    videoUrl: json['videoUrl'] as String?,
    imageUrl: json['imageUrl'] as String?,
    thumbnailUrl: json['thumbnailUrl'] as String?,
    xaiRequestId: json['xaiRequestId'] as String?,
    startedAt: json['startedAt'] != null ? DateTime.parse(json['startedAt'] as String) : null,
    completedAt: json['completedAt'] != null ? DateTime.parse(json['completedAt'] as String) : null,
    failedAt: json['failedAt'] != null ? DateTime.parse(json['failedAt'] as String) : null,
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
  );

  bool get isCompleted => status == 'COMPLETED';
  bool get isFailed => status == 'FAILED';
  bool get isProcessing => status == 'PROCESSING' || status == 'PENDING';
  bool get hasVideo => videoUrl != null && videoUrl!.isNotEmpty;
  bool get hasImage => imageUrl != null && imageUrl!.isNotEmpty;
}

class ChatMessage {
  final String id;
  final String role;
  final String? text;
  final String? status;
  final String? error;
  final String? imageUrl;
  final String? videoUrl;
  final String? scriptText;
  final String? generationId;
  final String? toolMode;
  final List<ChatAttachment>? attachments;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.role,
    this.text,
    this.status,
    this.error,
    this.imageUrl,
    this.videoUrl,
    this.scriptText,
    this.generationId,
    this.toolMode,
    this.attachments,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: json['id'] as String,
    role: json['role'] as String,
    text: json['text'] as String?,
    status: json['status'] as String?,
    error: json['error'] as String?,
    imageUrl: json['imageUrl'] as String?,
    videoUrl: json['videoUrl'] as String?,
    scriptText: json['scriptText'] as String?,
    generationId: json['generationId'] as String?,
    toolMode: json['toolMode'] as String?,
    attachments: json['attachments'] != null
        ? (json['attachments'] as List).map((e) => ChatAttachment.fromJson(e as Map<String, dynamic>)).toList()
        : null,
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'role': role,
    'text': text,
    'status': status,
    'error': error,
    'imageUrl': imageUrl,
    'videoUrl': videoUrl,
    'scriptText': scriptText,
    'generationId': generationId,
    'toolMode': toolMode,
    'attachments': attachments?.map((e) => e.toJson()).toList(),
    'createdAt': createdAt.toIso8601String(),
  };

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';
  bool get isProcessing => status == 'processing';
  bool get isFailed => status == 'failed';
  bool get isCompleted => status == 'completed';
}

class ChatAttachment {
  final String id;
  final String kind;
  final String url;
  final String? previewUrl;
  final String? name;

  ChatAttachment({
    required this.id,
    required this.kind,
    required this.url,
    this.previewUrl,
    this.name,
  });

  factory ChatAttachment.fromJson(Map<String, dynamic> json) => ChatAttachment(
    id: json['id'] as String,
    kind: json['kind'] as String,
    url: json['url'] as String,
    previewUrl: json['previewUrl'] as String?,
    name: json['name'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'kind': kind,
    'url': url,
    'previewUrl': previewUrl,
    'name': name,
  };

  bool get isImage => kind == 'image';
  bool get isVideo => kind == 'video';
}

class ChatSession {
  final String id;
  final String? name;
  final DateTime createdAt;
  final DateTime updatedAt;

  ChatSession({
    required this.id,
    this.name,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ChatSession.fromJson(Map<String, dynamic> json) => ChatSession(
    id: json['id'] as String,
    name: json['name'] as String?,
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };
}
