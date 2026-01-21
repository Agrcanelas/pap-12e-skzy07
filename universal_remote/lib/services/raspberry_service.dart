import 'dart:convert';
import 'package:http/http.dart' as http;

class RaspberryService {
  // IMPORTANTE: Substitui pelo IP do teu Raspberry Pi
  static const String baseUrl = 'http://192.168.1.4:5000';
  
  // Verificar se o Raspberry Pi está online
  Future<Map<String, dynamic>> checkStatus() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/status'),
      ).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        return {
          'status': 'offline',
          'message': 'Erro de conexão: ${response.statusCode}'
        };
      }
    } catch (e) {
      return {
        'status': 'offline',
        'message': 'Erro: $e'
      };
    }
  }

  // Enviar comando para o Raspberry Pi
  Future<Map<String, dynamic>> sendCommand(String command) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/send_command'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'command': command}),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        return {
          'success': false,
          'message': 'Erro: ${response.statusCode}'
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Erro de conexão: $e'
      };
    }
  }

  // Enviar número de canal
  Future<Map<String, dynamic>> sendNumber(String number) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/send_number'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'number': number}),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        return {
          'success': false,
          'message': 'Erro: ${response.statusCode}'
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Erro de conexão: $e'
      };
    }
  }
}