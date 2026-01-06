import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/history_service.dart';

class RemoteTab extends StatefulWidget {
  const RemoteTab({Key? key}) : super(key: key);

  @override
  State<RemoteTab> createState() => _RemoteTabState();
}

class _RemoteTabState extends State<RemoteTab> {
  final HistoryService _historyService = HistoryService();
  String _displayNumber = '';
  int? _userId;

  @override
  void initState() {
    super.initState();
    _loadUserId();
  }

  Future<void> _loadUserId() async {
    final prefs = await SharedPreferences.getInstance();
    _userId = prefs.getInt('userId');
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
    
    await _historyService.addHistory(
      userId: _userId!,
      channelNumber: channelNumber,
      channelName: 'Canal $channelNumber',
      channelLogo: '📺',
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Mudando para canal $_displayNumber')),
      );
      _clearDisplay();
    }
  }

  Widget _buildButton(dynamic content, {VoidCallback? onPressed, bool isNumber = false}) {
    return SizedBox(
      width: 60,
      height: 60,
      child: ElevatedButton(
        onPressed: onPressed,
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
                                    onPressed: _confirmChannel,
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
                      
                      // Power + Teclado numérico
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          // Power
                          Column(
                            children: [
                              _buildButton(Icons.power_settings_new, onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Power pressionado')),
                                );
                              }),
                            ],
                          ),
                          
                          // Números 1-9, 0
                          Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  _buildButton('1', onPressed: () => _onNumberPressed('1'), isNumber: true),
                                  const SizedBox(width: 8),
                                  _buildButton('2', onPressed: () => _onNumberPressed('2'), isNumber: true),
                                  const SizedBox(width: 8),
                                  _buildButton('3', onPressed: () => _onNumberPressed('3'), isNumber: true),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  _buildButton('4', onPressed: () => _onNumberPressed('4'), isNumber: true),
                                  const SizedBox(width: 8),
                                  _buildButton('5', onPressed: () => _onNumberPressed('5'), isNumber: true),
                                  const SizedBox(width: 8),
                                  _buildButton('6', onPressed: () => _onNumberPressed('6'), isNumber: true),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  _buildButton('7', onPressed: () => _onNumberPressed('7'), isNumber: true),
                                  const SizedBox(width: 8),
                                  _buildButton('8', onPressed: () => _onNumberPressed('8'), isNumber: true),
                                  const SizedBox(width: 8),
                                  _buildButton('9', onPressed: () => _onNumberPressed('9'), isNumber: true),
                                ],
                              ),
                              const SizedBox(height: 8),
                              _buildButton('0', onPressed: () => _onNumberPressed('0'), isNumber: true),
                            ],
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 8),
                      
                      // Navegação (D-pad)
                      Column(
                        children: [
                          _buildButton(Icons.keyboard_arrow_up, onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Cima pressionado')),
                            );
                          }),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _buildButton(Icons.keyboard_arrow_left, onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Esquerda pressionado')),
                                );
                              }),
                              const SizedBox(width: 16),
                              _buildButton(Icons.circle, onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('OK pressionado')),
                                );
                              }),
                              const SizedBox(width: 16),
                              _buildButton(Icons.keyboard_arrow_right, onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Direita pressionado')),
                                );
                              }),
                            ],
                          ),
                          const SizedBox(height: 8),
                          _buildButton(Icons.keyboard_arrow_down, onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Baixo pressionado')),
                            );
                          }),
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
                              _buildButton(Icons.add, onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Volume + pressionado')),
                                );
                              }),
                              const SizedBox(height: 8),
                              _buildButton(Icons.remove, onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Volume - pressionado')),
                                );
                              }),
                            ],
                          ),
                          Column(
                            children: [
                              const Text('CH', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              _buildButton(Icons.keyboard_arrow_up, onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Canal + pressionado')),
                                );
                              }),
                              const SizedBox(height: 8),
                              _buildButton(Icons.keyboard_arrow_down, onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Canal - pressionado')),
                                );
                              }),
                            ],
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 8),
                      
                      // Botões inferiores
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildButton(Icons.home, onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Home pressionado')),
                            );
                          }),
                          _buildButton(Icons.arrow_back, onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Voltar pressionado')),
                            );
                          }),
                          _buildButton(Icons.volume_off, onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Mute pressionado')),
                            );
                          }),
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