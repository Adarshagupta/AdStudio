class User {
  final String id;
  final String? clerkId;
  final String email;
  final String? name;
  final bool isActive;
  final String? lastWorkspaceId;
  final DateTime createdAt;
  final DateTime updatedAt;

  User({
    required this.id,
    this.clerkId,
    required this.email,
    this.name,
    required this.isActive,
    this.lastWorkspaceId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json['id'] as String,
    clerkId: json['clerkId'] as String?,
    email: json['email'] as String,
    name: json['name'] as String?,
    isActive: json['isActive'] as bool? ?? true,
    lastWorkspaceId: json['lastWorkspaceId'] as String?,
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'clerkId': clerkId,
    'email': email,
    'name': name,
    'isActive': isActive,
    'lastWorkspaceId': lastWorkspaceId,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };

  String get displayName => name ?? email.split('@').first;
}

class Workspace {
  final String id;
  final String name;
  final String slug;
  final String plan;
  final int creditsRemaining;
  final String? avatarUrl;
  final DateTime createdAt;
  final DateTime updatedAt;

  Workspace({
    required this.id,
    required this.name,
    required this.slug,
    required this.plan,
    required this.creditsRemaining,
    this.avatarUrl,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Workspace.fromJson(Map<String, dynamic> json) => Workspace(
    id: json['id'] as String,
    name: json['name'] as String,
    slug: json['slug'] as String,
    plan: json['plan'] as String,
    creditsRemaining: json['creditsRemaining'] as int? ?? 0,
    avatarUrl: json['avatarUrl'] as String?,
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'slug': slug,
    'plan': plan,
    'creditsRemaining': creditsRemaining,
    'avatarUrl': avatarUrl,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };
}

class WorkspaceMember {
  final String id;
  final String userId;
  final String workspaceId;
  final String role;
  final Map<String, dynamic>? permissions;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  WorkspaceMember({
    required this.id,
    required this.userId,
    required this.workspaceId,
    required this.role,
    this.permissions,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory WorkspaceMember.fromJson(Map<String, dynamic> json) => WorkspaceMember(
    id: json['id'] as String,
    userId: json['userId'] as String,
    workspaceId: json['workspaceId'] as String,
    role: json['role'] as String,
    permissions: json['permissions'] as Map<String, dynamic>?,
    isActive: json['isActive'] as bool? ?? true,
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
  );
}
