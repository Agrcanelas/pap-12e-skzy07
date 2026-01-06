import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/history_service.dart';
import '../services/favorites_service.dart';

class RecentTab extends StatefulWidget {
  const RecentTab({Key? key}) : super(key: key);

  @override
  State<RecentTab> createState() => _RecentTabState();
}

class _RecentTabState extends State<RecentTab> {
  final HistoryService _historyService = HistoryService();
  final FavoritesService _favoritesService = FavoritesService();
  List<Map<String, dynamic>> _recentChannels = [];
  List<int> _favoriteChannelNumbers = [];
  bool _isLoading = true;
  int? _userId;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    await _loadHistory();
    await _loadFavoriteNumbers();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);

    final prefs = await SharedPreferences.getInstance();
    _userId = prefs.getInt('userId');

    if (_userId != null) {
      final result = await _historyService.getHistory(_userId!);

      if (result['success'] == true && mounted) {
        setState(() {
          _recentChannels = List<Map<String, dynamic>>.from(result['history']);
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } else {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadFavoriteNumbers() async {
    if (_userId == null) return;

    final result = await _favoritesService.getFavorites(_userId!);
    
    if (result['success'] == true && mounted) {
      setState(() {
        _favoriteChannelNumbers = List<Map<String, dynamic>>.from(result['favorites'])
            .map((fav) => fav['channel_number'] as int)
            .toList();
      });
    }
  }

  bool _isFavorite(int channelNumber) {
    return _favoriteChannelNumbers.contains(channelNumber);
  }

  Future<void> _toggleFavorite(Map<String, dynamic> channel) async {
    if (_userId == null) return;

    final channelNumber = channel['channel_number'];
    final isFav = _isFavorite(channelNumber);

    if (isFav) {
      // Remove dos favoritos
      final result = await _favoritesService.removeFavorite(
        userId: _userId!,
        channelNumber: channelNumber,
      );

      if (mounted) {
        if (result['success'] == true) {
          setState(() {
            _favoriteChannelNumbers.remove(channelNumber);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Removido dos favoritos'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    } else {
      // Adiciona aos favoritos
      final result = await _favoritesService.addFavorite(
        userId: _userId!,
        channelNumber: channelNumber,
        channelName: channel['channel_name'],
        channelLogo: channel['channel_logo'],
      );

      if (mounted) {
        if (result['success'] == true) {
          setState(() {
            _favoriteChannelNumbers.add(channelNumber);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Adicionado aos favoritos!'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Erro ao adicionar'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Future<void> _clearHistory() async {
    if (_userId == null) return;

    final result = await _historyService.clearHistory(_userId!);

    if (mounted) {
      if (result['success'] == true) {
        setState(() {
          _recentChannels.clear();
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
            content: Text(result['message'] ?? 'Erro ao limpar'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _getTimeAgo(String dateTime) {
    try {
      final date = DateTime.parse(dateTime);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inMinutes < 60) {
        return '${difference.inMinutes} min';
      } else if (difference.inHours < 24) {
        return '${difference.inHours}h';
      } else {
        return '${difference.inDays}d';
      }
    } catch (e) {
      return '';
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
      _loadHistory();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Canais Recentes'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: _recentChannels.isEmpty ? null : () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Limpar Histórico'),
                  content: const Text('Tem certeza que deseja limpar todo o histórico?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar'),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _clearHistory();
                      },
                      style: TextButton.styleFrom(foregroundColor: Colors.red),
                      child: const Text('Limpar'),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _recentChannels.isEmpty
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
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView.builder(
                    itemCount: _recentChannels.length,
                    itemBuilder: (context, index) {
                      final channel = _recentChannels[index];
                      final isFav = _isFavorite(channel['channel_number']);
                      
                      return ListTile(
                        leading: CircleAvatar(
                          child: Text(channel['channel_logo'] ?? '📺'),
                        ),
                        title: Text(channel['channel_name']),
                        subtitle: Text('Canal ${channel['channel_number']}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _getTimeAgo(channel['data_visualizado']),
                              style: TextStyle(color: Colors.grey[600], fontSize: 12),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: Icon(
                                isFav ? Icons.favorite : Icons.favorite_border,
                                color: isFav ? Colors.red : Colors.grey,
                              ),
                              onPressed: () => _toggleFavorite(channel),
                            ),
                          ],
                        ),
                        onTap: () => _selectChannel(channel),
                      );
                    },
                  ),
                ),
    );
  }
}