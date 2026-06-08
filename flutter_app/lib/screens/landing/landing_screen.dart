import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../core/theme.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF4C1D95),
              Color(0xFF5B21B6),
              Color(0xFF7C3AED),
              Color(0xFF0EA5E9),
              Color(0xFF7DD3FC),
              Color(0xFFE0E7FF),
              Color(0xFFF5F3FF),
            ],
            stops: [0.0, 0.12, 0.22, 0.48, 0.72, 0.92, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Ad Studio',
                      style: TextStyle(
                        fontFamily: 'Quicksand',
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Row(
                      children: [
                        TextButton(
                          onPressed: () => context.push('/login'),
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Log in'),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () => context.push('/signup'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppTheme.primaryDark,
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                          ),
                          child: const Text('Sign up'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      const SizedBox(height: 40),
                      const Text(
                        'What will you create today?',
                        style: TextStyle(
                          fontFamily: 'Quicksand',
                          fontSize: 40,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Make AI-powered UGC ads, Studio Pro flows, and social-ready videos — all in one workspace.',
                        style: TextStyle(
                          fontSize: 18,
                          color: Colors.white70,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 40),
                      ElevatedButton.icon(
                        onPressed: () => context.push('/signup'),
                        icon: const Icon(Icons.auto_fix_high),
                        label: const Text('Get Started Free'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AppTheme.primaryDark,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                          textStyle: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        '25 free credits · No credit card required',
                        style: TextStyle(
                          color: Colors.white60,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 60),
                      _FeatureCard(
                        icon: Icons.chat_bubble_outline,
                        title: 'AI Chat Dashboard',
                        description: 'Generate images, videos, and scripts with natural language prompts.',
                      ),
                      const SizedBox(height: 16),
                      _FeatureCard(
                        icon: Icons.auto_fix_high,
                        title: 'Studio Pro',
                        description: 'Visual node editor for complex ad production pipelines.',
                      ),
                      const SizedBox(height: 16),
                      _FeatureCard(
                        icon: Icons.people_outline,
                        title: 'Team Collaboration',
                        description: 'Real-time collaboration with live cursors and synced flows.',
                      ),
                      const SizedBox(height: 60),
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Column(
                          children: [
                            const Text(
                              'Start free, scale with your team',
                              style: TextStyle(
                                fontFamily: 'Quicksand',
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Every workspace includes 25 generation credits to get started.',
                              style: TextStyle(
                                color: AppTheme.textSecondary,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 24),
                            ElevatedButton(
                              onPressed: () => context.push('/signup'),
                              child: const Text('Create Free Workspace'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(16),
                color: Colors.white,
                child: const SafeArea(
                  top: false,
                  child: Column(
                    children: [
                      Text(
                        'Ad Studio',
                        style: TextStyle(
                          fontFamily: 'Quicksand',
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'UGC ads and short-video generation for marketing teams.',
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _FeatureCard({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
