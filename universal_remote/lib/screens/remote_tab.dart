import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/history_service.dart';
import '../services/raspberry_service.dart';

class RemoteTab extends StatefulWidget {
  const RemoteTab({Key? key}) : super(key: key);

  @override
  State<RemoteTab> createState() => _RemoteTabState();
}

class _RemoteTabState extends State<RemoteTab> {
  final HistoryService _historyService = HistoryService();
  final RaspberryService _raspberryService = RaspberryService();
  String _displayNumber = '';
  int? _userId;
  bool _isConnected = false;
  bool _isCheckingConnection = true;

  @override
  void initState() {
    super.initState();
    _loadUserId();
    _checkRaspberryConnection();
  }

  Future<void> _loadUserId() async {
    final prefs = await SharedPreferences.getInstance();
    _userId = prefs.getInt('userId');
  }

  Future<void> _checkRaspberryConnection() async {
    setState(() => _isCheckingConnection = true);
    
    final status = await _raspberryService.checkStatus();
    
    if (mounted) {
      setState(() {
        _isConnected = status['status'] == 'online';
        _isCheckingConnection = false;
      });

      if (!_isConnected) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('⚠️ Raspberry Pi desconectado'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    }
  }

  void _onNumberPressed(String number) {
    setState(() {
      if (_displayNumber.length < 4) {
        _displayNumber += number;
      }
    });
  }

  void _clearDisplay() {
    setState(() {
      _displayNumber = '';
    });
  }

  Future<void> _confirmChannel() async {
    if (_displayNumber.isEmpty || _userId == null) return;

    final channelNumber = int.parse(_displayNumber);
    
    // Envia para o Raspberry Pi
    final result = await _raspberryService.sendNumber(_displayNumber);
    
    if (result['success'] == true) {
      // Adiciona ao histórico
      await _historyService.addHistory(
        userId: _userId!,
        channelNumber: channelNumber,
        channelName: 'Canal $channelNumber',
        channelLogo: '📺',
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('✓ Canal $_displayNumber')),
        );
        _clearDisplay();
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Erro ao enviar'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _sendCommand(String command, String label) async {
    final result = await _raspberryService.sendCommand(command);
    
    if (mounted) {
      if (result['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('✓ $label')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Erro'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildButton(dynamic content, String command, String label, {bool isNumber = false}) {
    return SizedBox(
      width: 60,
      height: 60,
      child: ElevatedButton(
        onPressed: _isConnected
            ? () {
                if (isNumber) {
                  _onNumberPressed(content.toString());
                } else {
                  _sendCommand(command, label);
                }
              }
            : null,
        style: ElevatedButton.styleFrom(
          shape: const CircleBorder(),
          padding: EdgeInsets.zero,
          elevation: 2,
        ),
        child: content is IconData
            ? Icon(content, size: 24)
            : Text(
                content.toString(),
                style: TextStyle(
                  fontSize: isNumber ? 22 : 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Comando Universal'),
        centerTitle: true,
        actions: [
          if (_isCheckingConnection)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Icon(
                _isConnected ? Icons.wifi : Icons.wifi_off,
                color: _isConnected ? Colors.green : Colors.red,
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _checkRaspberryConnection,
          ),
        ],
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      // Status
                      if (!_isConnected && !_isCheckingConnection)
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.orange.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.warning, color: Colors.orange),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Raspberry Pi desconectado. Verifique a conexão.',
                                  style: TextStyle(fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                        ),
                      
                      if (!_isConnected && !_isCheckingConnection)
                        const SizedBox(height: 8),
                      
                      // Display
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surfaceVariant,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _displayNumber.isEmpty ? 'Canal' : _displayNumber,
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                            ),
                            if (_displayNumber.isNotEmpty)
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.check_circle, size: 22),
                                    color: Colors.green,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: _isConnected ? _confirmChannel : null,
                                  ),
                                  const SizedBox(width: 8),
                                  IconButton(
                                    icon: const Icon(Icons.backspace, size: 20),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: _clearDisplay,
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 8),
                      
                      // Power + Números
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          Column(
                            children: [
                              _buildButton(Icons.power_settings_new, 'power', 'Power'),
                            ],
                          ),
                          
                          Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  _buildButton('1', '', '1', isNumber: true),
                                  const SizedBox(width: 8),
                                  _buildButton('2', '', '2', isNumber: true),
                                  const SizedBox(width: 8),
                                  _buildButton('3', '', '3', isNumber: true),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  _buildButton('4', '', '4', isNumber: true),
                                  const SizedBox(width: 8),
                                  _buildButton('5', '', '5', isNumber: true),
                                  const SizedBox(width: 8),
                                  _buildButton('6', '', '6', isNumber: true),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  _buildButton('7', '', '7', isNumber: true),
                                  const SizedBox(width: 8),
                                  _buildButton('8', '', '8', isNumber: true),
                                  const SizedBox(width: 8),
                                  _buildButton('9', '', '9', isNumber: true),
                                ],
                              ),
                              const SizedBox(height: 8),
                              _buildButton('0', '', '0', isNumber: true),
                            ],
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 8),
                      
                      // Navegação
                      Column(
                        children: [
                          _buildButton(Icons.keyboard_arrow_up, 'up', 'Cima'),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _buildButton(Icons.keyboard_arrow_left, 'left', 'Esquerda'),
                              const SizedBox(width: 16),
                              _buildButton(Icons.circle, 'ok', 'OK'),
                              const SizedBox(width: 16),
                              _buildButton(Icons.keyboard_arrow_right, 'right', 'Direita'),
                            ],
                          ),
                          const SizedBox(height: 8),
                          _buildButton(Icons.keyboard_arrow_down, 'down', 'Baixo'),
                        ],
                      ),
                      
                      const SizedBox(height: 8),
                      
                      // Volume e Canais
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          Column(
                            children: [
                              const Text('VOL', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              _buildButton(Icons.add, 'vol_up', 'Volume +'),
                              const SizedBox(height: 8),
                              _buildButton(Icons.remove, 'vol_down', 'Volume -'),
                            ],
                          ),
                          Column(
                            children: [
                              const Text('CH', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              _buildButton(Icons.keyboard_arrow_up, 'ch_up', 'Canal +'),
                              const SizedBox(height: 8),
                              _buildButton(Icons.keyboard_arrow_down, 'ch_down', 'Canal -'),
                            ],
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 8),
                      
                      // Botões inferiores
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildButton(Icons.home, 'home', 'Home'),
                          _buildButton(Icons.arrow_back, 'back', 'Voltar'),
                          _buildButton(Icons.volume_off, 'mute', 'Mute'),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}