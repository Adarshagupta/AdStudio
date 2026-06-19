import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../models/onboarding.dart';
import '../../providers/auth_provider.dart';
import '../../providers/onboarding_provider.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  final _companyNameController = TextEditingController();
  int _step = 0;
  bool _initializedFields = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await context.read<OnboardingProvider>().load();
      if (!mounted) return;
      final provider = context.read<OnboardingProvider>();
      _companyNameController.text = provider.companyName;
      setState(() => _initializedFields = true);
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _companyNameController.dispose();
    super.dispose();
  }

  void _next(OnboardingProvider provider) {
    if (_step < 3) {
      setState(() => _step++);
      _pageController.nextPage(
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
      provider.saveProgress();
      return;
    }
    _finish(provider);
  }

  Future<void> _finish(OnboardingProvider provider) async {
    final ok = await provider.complete();
    if (!mounted) return;

    if (ok) {
      final auth = context.read<AuthProvider>();
      auth.markOnboardingComplete();
      await auth.refreshWorkspace();
      if (!mounted) return;
      context.go('/feed');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.error ?? 'Could not complete onboarding')),
      );
    }
  }

  bool _canContinue(OnboardingProvider provider) {
    switch (_step) {
      case 0:
        return provider.companyName.trim().length >= 2;
      case 1:
        return provider.companySize != null;
      case 2:
        return provider.monthlyAdSpend != null;
      case 3:
        if (provider.hearAboutSource == null) return false;
        if (provider.hearAboutSource == 'other') {
          return provider.hearAboutOther.trim().length >= 2;
        }
        return true;
      default:
        return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OnboardingProvider>();

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: provider.isLoading || !_initializedFields
            ? const Center(child: CircularProgressIndicator(color: AppTheme.textMuted))
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Step ${_step + 1} of 4',
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: (_step + 1) / 4,
                            minHeight: 3,
                            backgroundColor: AppTheme.border,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: PageView(
                      controller: _pageController,
                      physics: const NeverScrollableScrollPhysics(),
                      children: [
                        _StepShell(
                          title: 'What\'s your company name?',
                          subtitle: 'We\'ll personalize your workspace.',
                          child: TextField(
                            autofocus: true,
                            controller: _companyNameController,
                            style: const TextStyle(color: AppTheme.textPrimary),
                            decoration: const InputDecoration(hintText: 'Acme Inc.'),
                            onChanged: (v) {
                              provider.companyName = v;
                              setState(() {});
                            },
                          ),
                        ),
                        _StepShell(
                          title: 'Team size',
                          subtitle: 'How many people are on your team?',
                          child: _OptionGrid(
                            options: companySizeOptions,
                            selected: provider.companySize,
                            onSelect: (v) {
                              provider.companySize = v;
                              setState(() {});
                            },
                          ),
                        ),
                        _StepShell(
                          title: 'Monthly ad spend',
                          subtitle: 'Roughly how much do you spend on ads?',
                          child: _OptionGrid(
                            options: monthlyAdSpendOptions,
                            selected: provider.monthlyAdSpend,
                            onSelect: (v) {
                              provider.monthlyAdSpend = v;
                              setState(() {});
                            },
                          ),
                        ),
                        _StepShell(
                          title: 'How did you find us?',
                          subtitle: 'Help us understand what brought you here.',
                          child: Column(
                            children: [
                              _OptionGrid(
                                options: hearAboutOptions,
                                selected: provider.hearAboutSource,
                                onSelect: (v) {
                                  provider.hearAboutSource = v;
                                  setState(() {});
                                },
                              ),
                              if (provider.hearAboutSource == 'other') ...[
                                const SizedBox(height: 16),
                                TextField(
                                  style: const TextStyle(color: AppTheme.textPrimary),
                                  decoration: const InputDecoration(
                                    hintText: 'Tell us where…',
                                  ),
                                  onChanged: (v) {
                                    provider.hearAboutOther = v;
                                    setState(() {});
                                  },
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                    child: ElevatedButton(
                      onPressed: provider.isSaving || !_canContinue(provider)
                          ? null
                          : () => _next(provider),
                      child: Text(_step == 3 ? 'Get started' : 'Continue'),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _StepShell extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;

  const _StepShell({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 24),
          Text(
            title,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 28,
              fontWeight: FontWeight.w700,
              height: 1.15,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 16),
          ),
          const SizedBox(height: 28),
          Expanded(child: SingleChildScrollView(child: child)),
        ],
      ),
    );
  }
}

class _OptionGrid extends StatelessWidget {
  final List<SelectOption> options;
  final String? selected;
  final ValueChanged<String> onSelect;

  const _OptionGrid({
    required this.options,
    required this.selected,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: options.map((option) {
        final isSelected = selected == option.value;
        return Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          child: InkWell(
            onTap: () => onSelect(option.value),
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: AppTheme.chipDecoration(selected: isSelected),
              child: Text(
                option.label,
                style: AppTheme.chipTextStyle(selected: isSelected),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
