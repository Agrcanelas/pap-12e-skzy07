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
    
    final result = await _raspberryService.sendNumber(_displayNumber);
    
    if (result['success'] == true) {
      await _historyService.addHistory(
        userId: _userId!,
        channelNumber: channelNumber,
        channelName: 'Canal $channelNumber',
        channelLogo: '📺',
      );

      if (mounted) {
        _clearDisplay();
      }
    }
  }

  Future<void> _sendCommand(String command) async {
    await _raspberryService.sendCommand(command);
  }

  Widget _buildRemoteButton({
    required Widget child,
    required VoidCallback? onPressed,
    Color? color,
  }) {
    final theme = Theme.of(context);
    final isEnabled = onPressed != null && _isConnected;
    final buttonColor = color ?? theme.colorScheme.primary.withOpacity(0.9);
    
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isEnabled ? buttonColor : Colors.grey.shade400,
        boxShadow: isEnabled
            ? [
                BoxShadow(
                  color: buttonColor.withOpacity(0.4),
                  blurRadius: 6,
                  offset: const Offset(0, 3),
                ),
              ]
            : [],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isEnabled ? onPressed : null,
          customBorder: const CircleBorder(),
          child: Center(child: child),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF1A1A1A) : const Color(0xFFF5F5F5),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.tv, color: theme.colorScheme.primary, size: 24),
            const SizedBox(width: 8),
            const Text('Comando', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 20)),
          ],
        ),
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
              padding: const EdgeInsets.only(right: 4),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: _isConnected ? Colors.green.withOpacity(0.15) : Colors.red.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: _isConnected ? Colors.green : Colors.red,
                      width: 1.5,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _isConnected ? Colors.green : Colors.red,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _isConnected ? 'ON' : 'OFF',
                        style: TextStyle(
                          color: _isConnected ? Colors.green.shade700 : Colors.red.shade700,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (!_isCheckingConnection)
            IconButton(
              icon: Icon(
                Icons.refresh,
                color: _isConnected ? Colors.grey : theme.colorScheme.primary,
              ),
              onPressed: _checkRaspberryConnection,
              tooltip: 'Reconectar',
            ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 400),
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Display
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF2A2A2A) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: theme.colorScheme.primary.withOpacity(0.3),
                      width: 2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: theme.colorScheme.primary.withOpacity(0.1),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.tv, color: theme.colorScheme.primary, size: 22),
                          const SizedBox(width: 12),
                          Text(
                            _displayNumber.isEmpty ? '---' : _displayNumber,
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w700,
                              color: theme.colorScheme.onSurface,
                              letterSpacing: 4,
                            ),
                          ),
                        ],
                      ),
                      if (_displayNumber.isNotEmpty)
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.check_circle, size: 26),
                              color: Colors.green,
                              onPressed: _isConnected ? _confirmChannel : null,
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                            const SizedBox(width: 12),
                            IconButton(
                              icon: Icon(Icons.backspace, size: 22, color: theme.colorScheme.onSurface),
                              onPressed: _clearDisplay,
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Corpo do comando
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF2A2A2A) : Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Power Button
                      _buildRemoteButton(
                        onPressed: () => _sendCommand('power'),
                        color: Colors.red.shade600,
                        child: const Icon(Icons.power_settings_new, color: Colors.white, size: 26),
                      ),

                      const SizedBox(height: 20),

                      // Row 1: Home, 1, Back
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildRemoteButton(
                            onPressed: () => _sendCommand('home'),
                            child: const Icon(Icons.home_rounded, color: Colors.white, size: 22),
                          ),
                          _buildRemoteButton(
                            onPressed: () => _onNumberPressed('1'),
                            child: const Text('1', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                          ),
                          _buildRemoteButton(
                            onPressed: () => _sendCommand('back'),
                            child: const Icon(Icons.arrow_back_rounded, color: Colors.white, size: 22),
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),

                      // Row 2: 2, 3, 4
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildRemoteButton(
                            onPressed: () => _onNumberPressed('2'),
                            child: const Text('2', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                          ),
                          _buildRemoteButton(
                            onPressed: () => _onNumberPressed('3'),
                            child: const Text('3', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                          ),
                          _buildRemoteButton(
                            onPressed: () => _onNumberPressed('4'),
                            child: const Text('4', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),

                      // Row 3: 5, 6, 7
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildRemoteButton(
                            onPressed: () => _onNumberPressed('5'),
                            child: const Text('5', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                          ),
                          _buildRemoteButton(
                            onPressed: () => _onNumberPressed('6'),
                            child: const Text('6', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                          ),
                          _buildRemoteButton(
                            onPressed: () => _onNumberPressed('7'),
                            child: const Text('7', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),

                      // Row 4: 8, 9, Mute
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildRemoteButton(
                            onPressed: () => _onNumberPressed('8'),
                            child: const Text('8', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                          ),
                          _buildRemoteButton(
                            onPressed: () => _onNumberPressed('9'),
                            child: const Text('9', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                          ),
                          _buildRemoteButton(
                            onPressed: () => _sendCommand('mute'),
                            child: const Icon(Icons.volume_off_rounded, color: Colors.white, size: 22),
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),

                      // Row 5: Vol-, 0, Vol+
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildRemoteButton(
                            onPressed: () => _sendCommand('vol_down'),
                            color: Colors.blue.shade600,
                            child: const Text('VOL-', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                          _buildRemoteButton(
                            onPressed: () => _onNumberPressed('0'),
                            child: const Text('0', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                          ),
                          _buildRemoteButton(
                            onPressed: () => _sendCommand('vol_up'),
                            color: Colors.blue.shade600,
                            child: const Text('VOL+', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // D-Pad Navigation
                      Column(
                        children: [
                          _buildRemoteButton(
                            onPressed: () => _sendCommand('up'),
                            child: const Icon(Icons.keyboard_arrow_up_rounded, color: Colors.white, size: 28),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _buildRemoteButton(
                                onPressed: () => _sendCommand('left'),
                                child: const Icon(Icons.keyboard_arrow_left_rounded, color: Colors.white, size: 28),
                              ),
                              const SizedBox(width: 16),
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: theme.colorScheme.secondary,
                                  boxShadow: [
                                    BoxShadow(
                                      color: theme.colorScheme.secondary.withOpacity(0.4),
                                      blurRadius: 8,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    onTap: _isConnected ? () => _sendCommand('ok') : null,
                                    customBorder: const CircleBorder(),
                                    child: const Center(
                                      child: Text(
                                        'OK',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              _buildRemoteButton(
                                onPressed: () => _sendCommand('right'),
                                child: const Icon(Icons.keyboard_arrow_right_rounded, color: Colors.white, size: 28),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          _buildRemoteButton(
                            onPressed: () => _sendCommand('down'),
                            child: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white, size: 28),
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // CH- and CH+
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _buildRemoteButton(
                            onPressed: () => _sendCommand('ch_down'),
                            color: Colors.purple.shade600,
                            child: const Text('CH-', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                          const SizedBox(width: 56), // Espaço para simetria
                          _buildRemoteButton(
                            onPressed: () => _sendCommand('ch_up'),
                            color: Colors.purple.shade600,
                            child: const Text('CH+', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}