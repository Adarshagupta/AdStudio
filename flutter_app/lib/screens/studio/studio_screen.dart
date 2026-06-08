import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class StudioScreen extends StatefulWidget {
  const StudioScreen({super.key});

  @override
  State<StudioScreen> createState() => _StudioScreenState();
}

class _StudioScreenState extends State<StudioScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Studio Pro'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showNewFlowDialog(context),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.auto_fix_high,
              size: 64,
              color: Colors.grey,
            ),
            const SizedBox(height: 16),
            const Text(
              'Studio Pro',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Visual node editor for ad production\n(Coming in next update)',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _showNewFlowDialog(context),
              icon: const Icon(Icons.add),
              label: const Text('Create New Flow'),
            ),
          ],
        ),
      ),
    );
  }

  void _showNewFlowDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create New Flow'),
        content: const TextField(
          decoration: InputDecoration(
            labelText: 'Flow Name',
            hintText: 'e.g., Summer Campaign',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Create flow
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}
