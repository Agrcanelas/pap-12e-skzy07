import 'dart:convert';
import 'package:http/http.dart' as http;

class HistoryService {
  static const String baseUrl = 'http://localhost/remote_api';

  // Obter histórico do utilizador
  Future<Map<String, dynamic>> getHistory(int userId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/get_history.php'),
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

  // Adicionar ao histórico
  Future<Map<String, dynamic>> addHistory({
    required int userId,
    required int channelNumber,
    required String channelName,
    String channelLogo = '📺',
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/add_history.php'),
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

  // Limpar histórico
  Future<Map<String, dynamic>> clearHistory(int userId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/clear_history.php'),
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
}