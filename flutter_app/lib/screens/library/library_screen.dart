import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../models/generation.dart';
import '../../providers/auth_provider.dart';
import '../../providers/generation_provider.dart';
import '../../widgets/create_sheet.dart';
import '../../widgets/generation_card.dart';

enum _LibraryFilter { all, ready, processing }

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key});

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  final _scrollController = ScrollController();
  _LibraryFilter _filter = _LibraryFilter.all;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final auth = context.read<AuthProvider>();
      final provider = context.read<GenerationProvider>();
      await auth.refreshWorkspace();
      if (provider.generations.isEmpty) {
        await provider.loadGenerations(refresh: true);
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 400) {
      final provider = context.read<GenerationProvider>();
      if (provider.hasMore && !provider.isLoading) {
        provider.loadGenerations();
      }
    }
  }

  List<Generation> _applyFilter(List<Generation> items) {
    switch (_filter) {
      case _LibraryFilter.ready:
        return items.where((g) => g.isCompleted).toList();
      case _LibraryFilter.processing:
        return items.where((g) => g.isProcessing).toList();
      case _LibraryFilter.all:
        return items;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final generation = context.watch<GenerationProvider>();
    final all = generation.generations;
    final items = _applyFilter(all);
    final readyCount = all.where((g) => g.isCompleted).length;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: RefreshIndicator(
        color: AppTheme.accent,
        backgroundColor: AppTheme.surface,
        onRefresh: () async {
          await auth.refreshWorkspace();
          await generation.loadGenerations(refresh: true);
        },
        child: CustomScrollView(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Library',
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 28,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'All your creations in one place',
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 14,
                        ),
                      ),
                      if (generation.error != null) ...[
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceElevated,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.info_outline_rounded,
                                  color: AppTheme.textSecondary, size: 18),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  generation.error!,
                                  style: const TextStyle(
                                    color: AppTheme.textSecondary,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              GestureDetector(
                                onTap: generation.clearError,
                                child: const Icon(Icons.close_rounded,
                                    color: AppTheme.textMuted, size: 18),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          _StatCard(
                            label: 'Creations',
                            value: '${all.length}',
                            icon: Icons.movie_creation_outlined,
                          ),
                          const SizedBox(width: 12),
                          _StatCard(
                            label: 'Ready',
                            value: '$readyCount',
                            icon: Icons.check_circle_outline_rounded,
                          ),
                          const SizedBox(width: 12),
                          _StatCard(
                            label: 'Credits',
                            value: '${auth.workspace?.creditsRemaining ?? 0}',
                            icon: Icons.bolt_rounded,
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      _FilterBar(
                        filter: _filter,
                        onChanged: (f) => setState(() => _filter = f),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ),
            if (items.isEmpty && !generation.isLoading)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _EmptyLibrary(onCreate: () => showCreateSheet(context)),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 120),
                sliver: SliverGrid(
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: 0.66,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final item = items[index];
                      return GenerationCard(
                        generation: item,
                        onTap: () => context.push('/generation', extra: item),
                      );
                    },
                    childCount: items.length,
                  ),
                ),
              ),
            if (generation.isLoading)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.only(bottom: 40),
                  child: Center(
                    child: CircularProgressIndicator(color: AppTheme.textMuted),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 14),
        decoration: AppTheme.cardDecoration(radius: 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: AppTheme.textSecondary, size: 20),
            const SizedBox(height: 12),
            Text(
              value,
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 22,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  final _LibraryFilter filter;
  final ValueChanged<_LibraryFilter> onChanged;

  const _FilterBar({required this.filter, required this.onChanged});

  static const _labels = {
    _LibraryFilter.all: 'All',
    _LibraryFilter.ready: 'Ready',
    _LibraryFilter.processing: 'Processing',
  };

  @override
  Widget build(BuildContext context) {
    return Row(
      children: _LibraryFilter.values.map((f) {
        final selected = f == filter;
        return Padding(
          padding: const EdgeInsets.only(right: 10),
          child: GestureDetector(
            onTap: () => onChanged(f),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
              decoration: AppTheme.chipDecoration(selected: selected),
              child: Text(
                _labels[f]!,
                style: AppTheme.chipTextStyle(selected: selected),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _EmptyLibrary extends StatelessWidget {
  final VoidCallback onCreate;

  const _EmptyLibrary({required this.onCreate});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.video_library_outlined,
              size: 44,
              color: AppTheme.textMuted.withValues(alpha: 0.6),
            ),
            const SizedBox(height: 20),
            const Text(
              'No creations yet',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Your ads will appear here.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 14,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 28),
            OutlinedButton(
              onPressed: onCreate,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.textPrimary,
                side: const BorderSide(color: AppTheme.border),
                minimumSize: const Size(160, 46),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                ),
              ),
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }
}
