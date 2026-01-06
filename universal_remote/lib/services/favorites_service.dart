import 'dart:convert';
import 'package:http/http.dart' as http;

class FavoritesService {
  static const String baseUrl = 'http://localhost/remote_api';

  // Obter favoritos do utilizador
  Future<Map<String, dynamic>> getFavorites(int userId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/get_favorites.php'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'user_id': userId}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        return {
          'success': false,
          'message': 'Erro de conexão: ${response.statusCode}'
        };
      }
    } catch (e) {
      return {'success': false, 'message': 'Erro de rede: $e'};
    }
  }

  // Adicionar aos favoritos
  Future<Map<String, dynamic>> addFavorite({
    required int userId,
    required int channelNumber,
    required String channelName,
    String channelLogo = '📺',
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/add_favorite.php'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_id': userId,
          'channel_number': channelNumber,
          'channel_name': channelName,
          'channel_logo': channelLogo,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        return {
          'success': false,
          'message': 'Erro de conexão: ${response.statusCode}'
        };
      }
    } catch (e) {
      return {'success': false, 'message': 'Erro de rede: $e'};
    }
  }

  // Remover dos favoritos
  Future<Map<String, dynamic>> removeFavorite({
    required int userId,
    required int channelNumber,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/remove_favorite.php'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_id': userId,
          'channel_number': channelNumber,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        return {
          'success': false,
          'message': 'Erro de conexão: ${response.statusCode}'
        };
      }
    } catch (e) {
      return {'success': false, 'message': 'Erro de rede: $e'};
    }
  }
}