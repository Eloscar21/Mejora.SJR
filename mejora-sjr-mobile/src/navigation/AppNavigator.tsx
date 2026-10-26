/**
 * AppNavigator.tsx
 * Orquestador principal de navegación para Mejora SJR Mobile.
 * 
 * Reglas de US-003:
 * - Decodifica el token JWT y conmuta dinámicamente entre vistas según el rol:
 *   - Rol 1 (Ciudadano) -> CrearReporteView
 *   - Rol 2 (Trabajador) -> BandejaOrdenesView
 * - Pantalla inicial institucional SplashView (#0A3D62).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../providers/AuthProvider';
import { SplashView } from '../views/SplashView';
import { AuthView } from '../views/AuthView';
import { CrearReporteView } from '../views/CrearReporteView';
import { BandejaOrdenesView } from '../views/BandejaOrdenesView';

export const AppNavigator: React.FC = () => {
  const { currentScreen } = useAuth();

  const renderCurrentView = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashView />;
      case 'auth':
        return <AuthView />;
      case 'crearReporte':
        return <CrearReporteView />;
      case 'bandejaOrdenes':
        return <BandejaOrdenesView />;
      default:
        return <AuthView />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style={currentScreen === 'splash' ? 'light' : 'dark'} />
      {renderCurrentView()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
