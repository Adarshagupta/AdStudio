import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../providers/workspace_provider.dart';
import '../../core/theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final workspaceProvider = context.read<WorkspaceProvider>();
    await workspaceProvider.loadWorkspaceInfo();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final workspaceProvider = context.watch<WorkspaceProvider>();
    final user = authProvider.user;
    final workspace = authProvider.workspace;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // User Profile
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                    child: Text(
                      (user?.displayName ?? 'U').substring(0, 1).toUpperCase(),
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user?.displayName ?? 'User',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.email ?? '',
                    style: const TextStyle(
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // Workspace
          if (workspace != null) ...[
            const Text(
              'Workspace',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.work_outline),
                    title: const Text('Workspace Name'),
                    subtitle: Text(workspace.name),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => _showEditWorkspaceName(context),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.token),
                    title: const Text('Credits'),
                    subtitle: Text('${workspace.creditsRemaining} remaining'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.card_membership),
                    title: const Text('Plan'),
                    subtitle: Text(workspace.plan),
                    trailing: TextButton(
                      onPressed: () => _showUpgradeDialog(context),
                      child: const Text('Upgrade'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Account
          const Text(
            'Account',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.password),
                  title: const Text('Change Password'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _showChangePassword(context),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.notifications_outlined),
                  title: const Text('Notifications'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _showNotificationsSettings(context),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Danger Zone
          const Text(
            'Danger Zone',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: AppTheme.errorColor,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.logout, color: AppTheme.errorColor),
              title: const Text(
                'Logout',
                style: TextStyle(color: AppTheme.errorColor),
              ),
              onTap: () => _showLogoutConfirmation(context),
            ),
          ),
        ],
      ),
    );
  }

  void _showEditWorkspaceName(BuildContext context) {
    final controller = TextEditingController(
      text: context.read<AuthProvider>().workspace?.name,
    );
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Workspace Name'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Workspace Name',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final workspaceProvider = context.read<WorkspaceProvider>();
              await workspaceProvider.updateWorkspace({
                'name': controller.text,
              });
              if (context.mounted) {
                Navigator.pop(context);
                context.read<AuthProvider>().refreshWorkspace();
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showUpgradeDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Upgrade Plan'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _PlanCard(
              name: 'Free',
              price: '\$0',
              credits: '25/month',
              features: ['Basic generation', 'Standard support'],
            ),
            SizedBox(height: 12),
            _PlanCard(
              name: 'Starter',
              price: '\$29',
              credits: '100/month',
              features: ['All formats', 'Priority support', 'Team features'],
            ),
            SizedBox(height: 12),
            _PlanCard(
              name: 'Pro',
              price: '\$99',
              credits: '500/month',
              features: ['Unlimited generations', 'API access', 'Dedicated support'],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showChangePassword(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change Password'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              obscureText: true,
              decoration: InputDecoration(
                labelText: 'Current Password',
              ),
            ),
            SizedBox(height: 16),
            TextField(
              obscureText: true,
              decoration: InputDecoration(
                labelText: 'New Password',
              ),
            ),
            SizedBox(height: 16),
            TextField(
              obscureText: true,
              decoration: InputDecoration(
                labelText: 'Confirm Password',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Change'),
          ),
        ],
      ),
    );
  }

  void _showNotificationsSettings(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Notifications'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SwitchListTile(
              title: const Text('Generation Complete'),
              value: true,
              onChanged: (value) {},
            ),
            SwitchListTile(
              title: const Text('Generation Failed'),
              value: true,
              onChanged: (value) {},
            ),
            SwitchListTile(
              title: const Text('Team Invites'),
              value: true,
              onChanged: (value) {},
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showLogoutConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              await context.read<AuthProvider>().logout();
              if (context.mounted) {
                context.go('/login');
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final String name;
  final String price;
  final String credits;
  final List<String> features;

  const _PlanCard({
    required this.name,
    required this.price,
    required this.credits,
    required this.features,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                name,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              Text(
                price,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  color: AppTheme.primaryColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            credits,
            style: TextStyle(
              color: Colors.grey.shade600,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          ...features.map((feature) => Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Row(
              children: [
                Icon(
                  Icons.check,
                  size: 16,
                  color: Colors.grey.shade600,
                ),
                const SizedBox(width: 4),
                Text(
                  feature,
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }
}
