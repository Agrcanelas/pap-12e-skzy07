import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../main.dart';
import '../services/theme_service.dart';
// ignore: unused_import
import '../services/language_service.dart';
import 'login_screen.dart';

class SettingsTab extends StatefulWidget {
  const SettingsTab({Key? key}) : super(key: key);

  @override
  State<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<SettingsTab> {
  String _selectedTheme = 'system';
  String _selectedLanguage = 'pt';

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _selectedTheme = prefs.getString('theme') ?? 'system';
      _selectedLanguage = prefs.getString('language') ?? 'pt';
    });
  }

  Future<void> _changeTheme(String theme) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('theme', theme);
    setState(() => _selectedTheme = theme);
    
    MyApp.of(context)?.changeTheme(ThemeService.getThemeMode(theme));
  }

  Future<void> _changeLanguage(String langCode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('language', langCode);
    setState(() => _selectedLanguage = langCode);
    
    MyApp.of(context)?.changeLanguage(Locale(langCode));
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isLoggedIn', false);
    
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  void _showCredits() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Créditos'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Universal Remote App'),
            SizedBox(height: 8),
            Text('Versão 1.0.0'),
            SizedBox(height: 16),
            Text('Desenvolvido com Flutter'),
            SizedBox(height: 8),
            Text('© 2025 Todos os direitos reservados'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Definições'),
        centerTitle: true,
      ),
      body: ListView(
        children: [
          const SizedBox(height: 8),
          
          // Theme section
          ListTile(
            leading: const Icon(Icons.palette_outlined),
            title: const Text('Tema'),
            subtitle: Text(_getThemeName(_selectedTheme)),
            onTap: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Escolher Tema'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      RadioListTile<String>(
                        title: const Text('Sistema'),
                        value: 'system',
                        groupValue: _selectedTheme,
                        onChanged: (value) {
                          if (value != null) {
                            _changeTheme(value);
                            Navigator.pop(context);
                          }
                        },
                      ),
                      RadioListTile<String>(
                        title: const Text('Claro'),
                        value: 'light',
                        groupValue: _selectedTheme,
                        onChanged: (value) {
                          if (value != null) {
                            _changeTheme(value);
                            Navigator.pop(context);
                          }
                        },
                      ),
                      RadioListTile<String>(
                        title: const Text('Escuro'),
                        value: 'dark',
                        groupValue: _selectedTheme,
                        onChanged: (value) {
                          if (value != null) {
                            _changeTheme(value);
                            Navigator.pop(context);
                          }
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          
          const Divider(),
          
          // Language section
          ListTile(
            leading: const Icon(Icons.language_outlined),
            title: const Text('Idioma'),
            subtitle: Text(_getLanguageName(_selectedLanguage)),
            onTap: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Escolher Idioma'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      RadioListTile<String>(
                        title: const Text('Português'),
                        value: 'pt',
                        groupValue: _selectedLanguage,
                        onChanged: (value) {
                          if (value != null) {
                            _changeLanguage(value);
                            Navigator.pop(context);
                          }
                        },
                      ),
                      RadioListTile<String>(
                        title: const Text('English'),
                        value: 'en',
                        groupValue: _selectedLanguage,
                        onChanged: (value) {
                          if (value != null) {
                            _changeLanguage(value);
                            Navigator.pop(context);
                          }
                        },
                      ),
                      RadioListTile<String>(
                        title: const Text('Español'),
                        value: 'es',
                        groupValue: _selectedLanguage,
                        onChanged: (value) {
                          if (value != null) {
                            _changeLanguage(value);
                            Navigator.pop(context);
                          }
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          
          const Divider(),
          
          // Credits
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('Créditos'),
            onTap: _showCredits,
          ),
          
          const Divider(),
          
          // Logout
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Sair', style: TextStyle(color: Colors.red)),
            onTap: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Sair'),
                  content: const Text('Tem certeza que deseja sair?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar'),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _logout();
                      },
                      style: TextButton.styleFrom(foregroundColor: Colors.red),
                      child: const Text('Sair'),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  String _getThemeName(String theme) {
    switch (theme) {
      case 'light':
        return 'Claro';
      case 'dark':
        return 'Escuro';
      default:
        return 'Sistema';
    }
  }

  String _getLanguageName(String lang) {
    switch (lang) {
      case 'en':
        return 'English';
      case 'es':
        return 'Español';
      default:
        return 'Português';
    }
  }
}