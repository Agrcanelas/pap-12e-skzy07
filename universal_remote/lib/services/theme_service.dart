import 'package:flutter/material.dart';

class ThemeService {
  static ThemeMode getThemeMode(String themeName) {
    switch (themeName) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }
}