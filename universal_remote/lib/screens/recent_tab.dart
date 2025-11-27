import 'package:flutter/material.dart';

class RecentTab extends StatefulWidget {
  const RecentTab({Key? key}) : super(key: key);

  @override
  State<RecentTab> createState() => _RecentTabState();
}

class _RecentTabState extends State<RecentTab> {
  // TODO: Carregar do backend
  final List<Map<String, dynamic>> _recentChannels = [
    {'number': 5, 'name': 'Sport TV', 'logo': '⚽', 'time': '2 min atrás'},
    {'number': 1, 'name': 'RTP1', 'logo': '📺', 'time': '15 min atrás'},
    {'number': 8, 'name': 'Fox', 'logo': '🎬', 'time': '1 hora atrás'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Canais Recentes'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () {
              // TODO: Limpar histórico
              setState(() {
                _recentChannels.clear();
              });
            },
          ),
        ],
      ),
      body: _recentChannels.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.history, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'Sem histórico',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            )
          : ListView.builder(
              itemCount: _recentChannels.length,
              itemBuilder: (context, index) {
                final channel = _recentChannels[index];
                return ListTile(
                  leading: CircleAvatar(
                    child: Text(channel['logo']),
                  ),
                  title: Text(channel['name']),
                  subtitle: Text('Canal ${channel['number']}'),
                  trailing: Text(
                    channel['time'],
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                  onTap: () {
                    // TODO: Mudar para o canal
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text('Mudando para ${channel['name']}')),
                    );
                  },
                );
              },
            ),
    );
  }
}