import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/generation_provider.dart';

Future<void> showCreateSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const CreateSheet(),
  );
}

class CreateSheet extends StatefulWidget {
  const CreateSheet({super.key});

  @override
  State<CreateSheet> createState() => _CreateSheetState();
}

class _CreateSheetState extends State<CreateSheet> {
  final _promptController = TextEditingController();
  final _productController = TextEditingController();
  String _aspectRatio = '9:16';
  bool _submitting = false;

  static const _ratios = ['9:16', '1:1', '16:9'];

  @override
  void dispose() {
    _promptController.dispose();
    _productController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final prompt = _promptController.text.trim();
    if (prompt.length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add a prompt with at least 3 characters.')),
      );
      return;
    }

    final credits = context.read<AuthProvider>().workspace?.creditsRemaining ?? 0;
    if (credits <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No credits remaining. Visit litemoov.com to upgrade.')),
      );
      return;
    }

    setState(() => _submitting = true);

    final provider = context.read<GenerationProvider>();
    final auth = context.read<AuthProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    navigator.pop();

    final result = await provider.generateUgcVideo(
      prompt: prompt,
      productUrl: _productController.text.trim().isEmpty
          ? null
          : _productController.text.trim(),
      aspectRatio: _aspectRatio,
    );

    await auth.refreshWorkspace();

    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          result != null
              ? 'Your ad is ready.'
              : provider.error ?? 'Something went wrong. Try again.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final generation = context.watch<GenerationProvider>();
    final credits = auth.workspace?.creditsRemaining ?? 0;
    final canGenerate = credits > 0 && !generation.isGenerating && !_submitting;
    final viewInsets = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets),
      child: Container(
        decoration: const BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                const Text(
                  'Create UGC ad',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Text(
                  '$credits credits',
                  style: TextStyle(
                    color: credits > 0 ? AppTheme.textSecondary : AppTheme.error,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            if (credits <= 0) ...[
              const SizedBox(height: 8),
              const Text(
                'You need credits to generate. Sign in on litemoov.com to upgrade.',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
              ),
            ],
            const SizedBox(height: 18),
            Container(
              decoration: AppTheme.cardDecoration(radius: AppTheme.radiusMd),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: TextField(
                controller: _promptController,
                autofocus: true,
                maxLines: 4,
                minLines: 3,
                enabled: canGenerate,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 15),
                decoration: const InputDecoration(
                  hintText: 'Describe your ad — product, vibe, hook…',
                  border: InputBorder.none,
                  filled: false,
                  contentPadding: EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              decoration: AppTheme.cardDecoration(radius: AppTheme.radiusMd),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  const Icon(Icons.link_rounded, size: 18, color: AppTheme.textMuted),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _productController,
                      enabled: canGenerate,
                      style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                      keyboardType: TextInputType.url,
                      decoration: const InputDecoration(
                        hintText: 'Product URL (optional)',
                        border: InputBorder.none,
                        filled: false,
                        contentPadding: EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Aspect ratio',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 10),
            Row(
              children: _ratios.map((ratio) {
                final selected = ratio == _aspectRatio;
                return Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: GestureDetector(
                    onTap: canGenerate ? () => setState(() => _aspectRatio = ratio) : null,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                      decoration: AppTheme.chipDecoration(selected: selected),
                      child: Text(
                        ratio,
                        style: AppTheme.chipTextStyle(selected: selected),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: canGenerate ? _submit : null,
                child: _submitting || generation.isGenerating
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppTheme.onAccent,
                        ),
                      )
                    : const Text('Generate'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
