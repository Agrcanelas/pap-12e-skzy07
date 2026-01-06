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
  List<Map<String, dynamic>> _filteredChannels = [];
  bool _isLoading = true;
  int? _userId;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadFavorites();
    _searchController.addListener(_filterChannels);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterChannels() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredChannels = _favoriteChannels;
      } else {
        _filteredChannels = _favoriteChannels.where((channel) {
          final name = channel['channel_name'].toString().toLowerCase();
          final number = channel['channel_number'].toString();
          return name.contains(query) || number.contains(query);
        }).toList();
      }
    });
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
          _filteredChannels = _favoriteChannels;
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
        _loadFavorites(); // Recarrega a lista
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

  void _showAddChannelDialog() {
    final formKey = GlobalKey<FormState>();
    final channelNumberController = TextEditingController();
    final channelNameController = TextEditingController();
    String selectedEmoji = '📺';

    final List<String> emojis = ['📺', '⚽', '🎬', '🎥', '🏰', '🎭', '🌍', '📷', '🎵', '🎮', '📚', '🍔'];

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Adicionar Canal'),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: channelNumberController,
                    decoration: const InputDecoration(
                      labelText: 'Número do Canal',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.numbers),
                    ),
                    keyboardType: TextInputType.number,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Insira o número do canal';
                      }
                      if (int.tryParse(value) == null) {
                        return 'Número inválido';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: channelNameController,
                    decoration: const InputDecoration(
                      labelText: 'Nome do Canal',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.tv),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Insira o nome do canal';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  const Text('Escolha um ícone:', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: emojis.map((emoji) {
                      final isSelected = emoji == selectedEmoji;
                      return GestureDetector(
                        onTap: () {
                          setDialogState(() {
                            selectedEmoji = emoji;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: isSelected ? Colors.blue : Colors.grey,
                              width: isSelected ? 3 : 1,
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            emoji,
                            style: const TextStyle(fontSize: 30),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (formKey.currentState!.validate()) {
                  Navigator.pop(context);
                  await _addChannel(
                    int.parse(channelNumberController.text),
                    channelNameController.text,
                    selectedEmoji,
                  );
                }
              },
              child: const Text('Adicionar'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _addChannel(int channelNumber, String channelName, String emoji) async {
    if (_userId == null) return;

    setState(() => _isLoading = true);

    final result = await _favoritesService.addFavorite(
      userId: _userId!,
      channelNumber: channelNumber,
      channelName: channelName,
      channelLogo: emoji,
    );

    if (mounted) {
      if (result['success'] == true) {
        await _loadFavorites();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message']),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Erro ao adicionar'),
            backgroundColor: Colors.red,
          ),
        );
      }
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
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Pesquisar canais...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                        },
                      )
                    : null,
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredChannels.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.favorite_border,
                                size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text(
                              _searchController.text.isEmpty
                                  ? 'Sem favoritos ainda'
                                  : 'Nenhum canal encontrado',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                            if (_searchController.text.isEmpty) ...[
                              const SizedBox(height: 8),
                              Text(
                                'Clique no + para adicionar',
                                style: TextStyle(color: Colors.grey[500], fontSize: 12),
                              ),
                            ],
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadFavorites,
                        child: ListView.builder(
                          itemCount: _filteredChannels.length,
                          itemBuilder: (context, index) {
                            final channel = _filteredChannels[index];
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
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddChannelDialog,
        child: const Icon(Icons.add),
      ),
    );
  }
}