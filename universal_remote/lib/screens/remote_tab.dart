import 'package:flutter/material.dart';

class RemoteTab extends StatelessWidget {
  const RemoteTab({Key? key}) : super(key: key);

  Widget _buildButton(BuildContext context, IconData icon, String label,
      {VoidCallback? onPressed}) {
    return ElevatedButton(
      onPressed: onPressed ?? () {
        // TODO: Implementar lógica do controle IR
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$label pressionado')),
        );
      },
      style: ElevatedButton.styleFrom(
        shape: const CircleBorder(),
        padding: const EdgeInsets.all(20),
      ),
      child: Icon(icon, size: 28),
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
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // Power button
              _buildButton(context, Icons.power_settings_new, 'Power'),
              
              const SizedBox(height: 20),
              
              // Navigation buttons
              Column(
                children: [
                  _buildButton(context, Icons.keyboard_arrow_up, 'Cima'),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildButton(context, Icons.keyboard_arrow_left, 'Esquerda'),
                      const SizedBox(width: 20),
                      _buildButton(context, Icons.circle, 'OK'),
                      const SizedBox(width: 20),
                      _buildButton(context, Icons.keyboard_arrow_right, 'Direita'),
                    ],
                  ),
                  _buildButton(context, Icons.keyboard_arrow_down, 'Baixo'),
                ],
              ),
              
              const SizedBox(height: 20),
              
              // Volume and channel controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Column(
                    children: [
                      _buildButton(context, Icons.add, 'Vol+'),
                      const SizedBox(height: 10),
                      _buildButton(context, Icons.remove, 'Vol-'),
                    ],
                  ),
                  Column(
                    children: [
                      _buildButton(context, Icons.keyboard_arrow_up, 'CH+'),
                      const SizedBox(height: 10),
                      _buildButton(context, Icons.keyboard_arrow_down, 'CH-'),
                    ],
                  ),
                ],
              ),
              
              const SizedBox(height: 20),
              
              // Additional controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildButton(context, Icons.home, 'Home'),
                  _buildButton(context, Icons.arrow_back, 'Voltar'),
                  _buildButton(context, Icons.volume_off, 'Mute'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}