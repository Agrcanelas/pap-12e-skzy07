import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  // IMPORTANTE: Muda isto para o teu IP local se testares no telemóvel
  // Para web: localhost funciona
  // Para Android emulator: 10.0.2.2
  // Para dispositivo físico: o IP do teu PC (ex: 192.168.1.100)
  static const String baseUrl = 'http://localhost/remote_api';

  // Registar novo utilizador
  Future<Map<String, dynamic>> register({
    required String nome,
    required String email,
    required String senha,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/register.php'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'nome': nome,
          'email': email,
          'senha': senha,
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
      return {
        'success': false,
        'message': 'Erro de rede: $e'
      };
    }
  }

  // Fazer login
  Future<Map<String, dynamic>> login({
    required String email,
    required String senha,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login.php'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'senha': senha,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Se login com sucesso, guarda os dados
        if (data['success'] == true) {
          await _saveUserData(data['user']);
        }
        
        return data;
      } else {
        return {
          'success': false,
          'message': 'Erro de conexão: ${response.statusCode}'
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Erro de rede: $e'
      };
    }
  }

  // Guardar dados do utilizador localmente
  Future<void> _saveUserData(Map<String, dynamic> user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isLoggedIn', true);
    await prefs.setInt('userId', user['id']);
    await prefs.setString('userName', user['nome']);
    await prefs.setString('userEmail', user['email']);
    await prefs.setString('userDataCriacao', user['data_criacao'] ?? '');
  }

  // Obter dados do utilizador guardados
  Future<Map<String, dynamic>?> getUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final isLoggedIn = prefs.getBool('isLoggedIn') ?? false;
    
    if (!isLoggedIn) return null;
    
    return {
      'id': prefs.getInt('userId'),
      'nome': prefs.getString('userName'),
      'email': prefs.getString('userEmail'),
      'data_criacao': prefs.getString('userDataCriacao'),
    };
  }

  // Fazer logout
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}