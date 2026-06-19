class OnboardingState {
  final bool completed;
  final String workspaceName;
  final String? companyName;
  final String? companySize;
  final String? monthlyAdSpend;
  final String? hearAboutSource;
  final String? hearAboutOther;

  OnboardingState({
    required this.completed,
    required this.workspaceName,
    this.companyName,
    this.companySize,
    this.monthlyAdSpend,
    this.hearAboutSource,
    this.hearAboutOther,
  });

  factory OnboardingState.fromJson(Map<String, dynamic> json) =>
      OnboardingState(
        completed: json['completed'] as bool? ?? false,
        workspaceName: json['workspaceName'] as String? ?? 'Workspace',
        companyName: json['companyName'] as String?,
        companySize: json['companySize'] as String?,
        monthlyAdSpend: json['monthlyAdSpend'] as String?,
        hearAboutSource: json['hearAboutSource'] as String?,
        hearAboutOther: json['hearAboutOther'] as String?,
      );
}

class SelectOption {
  final String value;
  final String label;

  const SelectOption({required this.value, required this.label});
}

const companySizeOptions = [
  SelectOption(value: 'SIZE_1_5', label: '1–5'),
  SelectOption(value: 'SIZE_6_50', label: '6–50'),
  SelectOption(value: 'SIZE_51_100', label: '51–100'),
  SelectOption(value: 'SIZE_100_PLUS', label: '100+'),
];

const monthlyAdSpendOptions = [
  SelectOption(value: 'UNDER_20K', label: '< \$20K'),
  SelectOption(value: 'SPEND_20K_100K', label: '\$20K – \$100K'),
  SelectOption(value: 'SPEND_100K_1M', label: '\$100K – \$1M'),
  SelectOption(value: 'SPEND_1M_PLUS', label: '\$1M+'),
];

const hearAboutOptions = [
  SelectOption(value: 'friend_colleagues', label: 'Friend or colleague'),
  SelectOption(value: 'ai_search', label: 'AI search / ChatGPT'),
  SelectOption(value: 'x_twitter', label: 'X / Twitter'),
  SelectOption(value: 'linkedin', label: 'LinkedIn'),
  SelectOption(value: 'google_search', label: 'Google search'),
  SelectOption(value: 'instagram_creator', label: 'Instagram creator'),
  SelectOption(value: 'youtube_creator', label: 'YouTube creator'),
  SelectOption(value: 'youtube_ad', label: 'YouTube ad'),
  SelectOption(value: 'google_ad', label: 'Google ad'),
  SelectOption(value: 'meta_ad', label: 'Meta ad'),
  SelectOption(value: 'other', label: 'Other'),
];
