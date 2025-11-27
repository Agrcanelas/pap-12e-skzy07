import 'package:flutter/material.dart';

class FavoritesTab extends StatefulWidget {
  const FavoritesTab({Key? key}) : super(key: key);

  @override
  State<FavoritesTab> createState() => _FavoritesTabState();
}

class _FavoritesTabState extends State<FavoritesTab> {
  // TODO: Carregar do backend
  final List<Map<String, dynamic>> _favoriteChannels = [
    {'number': 1, 'name': 'RTP1', 'logo': '📺'},
    {'number': 2, 'name': 'SIC', 'logo': '📺'},
    {'number': 3, 'name': 'TVI', 'logo': '📺'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Canais Favoritos'),
        centerTitle: true,
      ),
      body: _favoriteChannels.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.favorite_border,
                      size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'Sem favoritos ainda',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            )
          : ListView.builder(
              itemCount: _favoriteChannels.length,
              itemBuilder: (context, index) {
                final channel = _favoriteChannels[index];
                return ListTile(
                  leading: CircleAvatar(
                    child: Text(channel['logo']),
                  ),
                  title: Text(channel['name']),
                  subtitle: Text('Canal ${channel['number']}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.favorite, color: Colors.red),
                    onPressed: () {
                      // TODO: Remover dos favoritos
                      setState(() {
                        _favoriteChannels.removeAt(index);
                      });
                    },
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