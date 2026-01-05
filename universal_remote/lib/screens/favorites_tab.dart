import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/favorites_service.dart';
import '../services/history_service.dart';

class FavoritesTab extends StatefulWidget {
  const FavoritesTab({Key? key}) : super(key: key);

  @override
  State<FavoritesTab> createState() => _FavoritesTabState();
}

class _FavoritesTabState extends State<FavoritesTab> {
  final FavoritesService _favoritesService = FavoritesService();
  final HistoryService _historyService = HistoryService();
  List<Map<String, dynamic>> _favoriteChannels = [];
  bool _isLoading = true;
  int? _userId;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    setState(() => _isLoading = true);

    final prefs = await SharedPreferences.getInstance();
    _userId = prefs.getInt('userId');

    if (_userId != null) {
      final result = await _favoritesService.getFavorites(_userId!);
      
      if (result['success'] == true && mounted) {
        setState(() {
          _favoriteChannels = List<Map<String, dynamic>>.from(result['favorites']);
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } else {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _removeFavorite(int channelNumber, int index) async {
    if (_userId == null) return;

    final result = await _favoritesService.removeFavorite(
      userId: _userId!,
      channelNumber: channelNumber,
    );

    if (mounted) {
      if (result['success'] == true) {
        setState(() {
          _favoriteChannels.removeAt(index);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message']),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Erro ao remover'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _selectChannel(Map<String, dynamic> channel) async {
    if (_userId == null) return;

    await _historyService.addHistory(
      userId: _userId!,
      channelNumber: channel['channel_number'],
      channelName: channel['channel_name'],
      channelLogo: channel['channel_logo'],
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Mudando para ${channel['channel_name']}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Canais Favoritos'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadFavorites,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _favoriteChannels.isEmpty
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
              : RefreshIndicator(
                  onRefresh: _loadFavorites,
                  child: ListView.builder(
                    itemCount: _favoriteChannels.length,
                    itemBuilder: (context, index) {
                      final channel = _favoriteChannels[index];
                      return ListTile(
                        leading: CircleAvatar(
                          child: Text(channel['channel_logo'] ?? '📺'),
                        ),
                        title: Text(channel['channel_name']),
                        subtitle: Text('Canal ${channel['channel_number']}'),
                        trailing: IconButton(
                          icon: const Icon(Icons.favorite, color: Colors.red),
                          onPressed: () => _removeFavorite(
                            channel['channel_number'],
                            index,
                          ),
                        ),
                        onTap: () => _selectChannel(channel),
                      );
                    },
                  ),
                ),
    );
  }
}