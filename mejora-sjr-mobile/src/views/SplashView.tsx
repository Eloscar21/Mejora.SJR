/**
 * SplashView.tsx
 * Pantalla de bienvenida institucional (US-003).
 * 
 * Reglas de US-003:
 * - Splash screen con color de fondo institucional #0A3D62.
 * - Verifica la sesión activa y redirige según el rol decodificado del JWT.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export const SplashView: React.FC = () => {
  const { authService, establecerSesion, setCurrentScreen } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const verificarSesionInicial = async () => {
      try {
        const token = await authService.obtenerToken();
        const session = await authService.obtenerUsuario();

        // Pausa para apreciar el Splash institucional (#0A3D62)
        await new Promise((r) => setTimeout(r, 1400));

        if (!isMounted) return;

        if (token && session) {
          establecerSesion(token, session);
        } else {
          setCurrentScreen('auth');
        }
      } catch (e) {
        if (isMounted) setCurrentScreen('auth');
      }
    };

    verificarSesionInicial();

    return () => {
      isMounted = false;
    };
  }, [authService, establecerSesion, setCurrentScreen]);

  return (
    <View style={styles.container}>
      {/* Insignia / Escudo Municipal Simulado */}
      <View style={styles.emblemContainer}>
        <View style={styles.crestCircle}>
          <Text style={styles.crestIcon}>🏛️</Text>
        </View>
        <Text style={styles.municipioHeader}>H. AYUNTAMIENTO DE</Text>
        <Text style={styles.municipioName}>SAN JUAN DEL RÍO</Text>
        <View style={styles.goldDivider} />
      </View>

      {/* Título de la Plataforma */}
      <View style={styles.brandContainer}>
        <Text style={styles.appTitle}>MEJORA SJR</Text>
        <Text style={styles.appSubtitle}>
          Sistema Integral de Gestión de Incidencias Urbanas y Servicios Públicos
        </Text>
      </View>

      {/* Indicador de Carga */}
      <View style={styles.footerContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Verificando credenciales seguras...</Text>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => setCurrentScreen('auth')}
        >
          <Text style={styles.skipButtonText}>Continuar al Inicio ➔</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A3D62', // Color exacto de US-003
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  emblemContainer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  crestCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D97706', // Oro cantera
    marginBottom: SPACING.md,
  },
  crestIcon: {
    fontSize: 40,
  },
  municipioHeader: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  municipioName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  goldDivider: {
    width: 60,
    height: 3,
    backgroundColor: '#D97706',
    marginTop: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  brandContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  appSubtitle: {
    color: '#E0F2FE',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
  },
  footerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    color: '#E0F2FE',
    fontSize: 13,
    marginTop: SPACING.sm,
    fontWeight: '500',
  },
  skipButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
});
