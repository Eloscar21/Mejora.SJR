/**
 * AuthView.tsx
 * Pantalla de Autenticación Móvil (Login y Registro) con validación visual (US-003).
 * 
 * Reglas de US-003:
 * - Login y registro con validación visual (rojo en error).
 * - Decodifica el token JWT:
 *   - Si es Rol 1 va a "Crear Reporte".
 *   - Si es Rol 2 va a "Bandeja de Órdenes".
 * - Incluye panel de pruebas rápidas con las 4 cuentas semilla del backend.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuthViewModel } from '../viewModels/useAuthViewModel';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { QuickCredentialsDrawer } from '../components/QuickCredentialsDrawer';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export const AuthView: React.FC = () => {
  const {
    authMode,
    nombre,
    email,
    password,
    confirmPassword,
    isLoading,
    errors,
    roleWarning,
    switchMode,
    handleNombreChange,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleLogin,
    handleRegistro,
    setQuickEmail,
  } = useAuthViewModel();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Cabecera Institucional */}
          <View style={styles.header}>
            <View style={styles.crestCircle}>
              <Text style={styles.crestIcon}>🏛️</Text>
            </View>
            <Text style={styles.title}>Mejora SJR Móvil</Text>
            <Text style={styles.subtitle}>
              Atención Ciudadana • Municipio de San Juan del Río
            </Text>
          </View>

          {/* Aviso de acceso para perfiles no admitidos en móvil */}
          {roleWarning && (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>⚠️ Acceso no permitido:</Text>
              <Text style={styles.warningText}>{roleWarning}</Text>
            </View>
          )}

          {/* Banner de Error General (Rojo de error) */}
          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerIcon}>⛔</Text>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          {/* Selector de Pestañas (Login / Registro) */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                authMode === 'login' && styles.tabButtonActive,
              ]}
              onPress={() => switchMode('login')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  authMode === 'login' && styles.tabButtonTextActive,
                ]}
              >
                Iniciar Sesión
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                authMode === 'registro' && styles.tabButtonActive,
              ]}
              onPress={() => switchMode('registro')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  authMode === 'registro' && styles.tabButtonTextActive,
                ]}
              >
                Registro Ciudadano
              </Text>
            </TouchableOpacity>
          </View>

          {/* Formulario */}
          <View style={styles.card}>
            {authMode === 'registro' && (
              <CustomInput
                label="Nombre Completo"
                value={nombre}
                onChangeText={handleNombreChange}
                placeholder="Ej. Juan Pérez"
                hasError={Boolean(errors.nombre)}
                errorMessage={errors.nombre}
                autoCapitalize="words"
              />
            )}

            <CustomInput
              label="Correo Electrónico"
              value={email}
              onChangeText={handleEmailChange}
              placeholder="ejemplo@test.com"
              hasError={Boolean(errors.email)}
              errorMessage={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <CustomInput
              label="Contraseña"
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="••••••••"
              secureTextEntry
              hasError={Boolean(errors.password)}
              errorMessage={errors.password}
            />

            {authMode === 'registro' && (
              <CustomInput
                label="Confirmar Contraseña"
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                placeholder="••••••••"
                secureTextEntry
                hasError={Boolean(errors.confirmPassword)}
                errorMessage={errors.confirmPassword}
              />
            )}

            <CustomButton
              title={
                authMode === 'login'
                  ? 'Ingresar al Sistema'
                  : 'Registrar Cuenta Ciudadana'
              }
              onPress={authMode === 'login' ? handleLogin : handleRegistro}
              isLoading={isLoading}
              style={styles.submitButton}
            />

            {authMode === 'registro' && (
              <Text style={styles.registroNota}>
                * Por seguridad municipal, todo nuevo registro crea una cuenta con perfil de Ciudadano (Rol 1).
              </Text>
            )}
          </View>

          {/* Drawer de Pruebas Rápidas Multirrol */}
          <QuickCredentialsDrawer onSelectAccount={setQuickEmail} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  crestCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0A3D62',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  crestIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  warningCard: {
    backgroundColor: COLORS.warningBackground,
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    width: '100%',
    marginBottom: SPACING.md,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBackground,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    width: '100%',
    marginBottom: SPACING.md,
  },
  errorBannerIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  errorBannerText: {
    fontSize: 13,
    color: COLORS.errorText,
    fontWeight: '600',
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    padding: 3,
    width: '100%',
    marginBottom: SPACING.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  tabButtonActive: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitButton: {
    marginTop: SPACING.xs,
  },
  registroNota: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    textAlign: 'center',
    lineHeight: 15,
  },
});
