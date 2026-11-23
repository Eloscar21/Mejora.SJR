/**
 * MisDatosView.tsx
 * Vista del apartado "Mis Datos" / Perfil Ciudadano en la App Móvil (US-032).
 *
 * Responsabilidad única (SRP / MVVM):
 * - Renderiza la tarjeta de identidad ciudadana, el resumen de participación municipal
 *   y el formulario editable de información personal y cambio opcional de contraseña.
 */

import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../components/CustomButton';
import { CustomInput } from '../components/CustomInput';
import { RoleBadge } from '../components/RoleBadge';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import type { useMisDatosViewModel } from '../viewModels/useMisDatosViewModel';

interface MisDatosViewProps {
  viewModel: ReturnType<typeof useMisDatosViewModel>;
}

export const MisDatosView: React.FC<MisDatosViewProps> = ({ viewModel: vm }) => {
  const esTrabajador = vm.perfil?.idRol === 2;
  const resumen = vm.perfil?.resumenReportes ?? {
    total: 0,
    recibidos: 0,
    enProceso: 0,
    resueltos: 0,
  };

  return (
    <Modal visible={vm.visible} animationType="slide" onRequestClose={vm.cerrar}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* 1. Cabecera Superior */}
          <View style={styles.header}>
            <View>
              <Text accessibilityRole="header" style={styles.title}>
                Mis datos
              </Text>
              <Text style={styles.subtitle}>
                {vm.perfil?.idRol === 2
                  ? 'Perfil de trabajador • San Juan del Río'
                  : 'Perfil ciudadano • San Juan del Río'}
              </Text>
            </View>
            <CustomButton
              title="Volver"
              variant="outline"
              onPress={vm.cerrar}
              disabled={vm.isSaving}
            />
          </View>

          {vm.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Cargando tu información personal...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* 2. Tarjeta de Identidad Ciudadana */}
              <View style={styles.identityCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{vm.iniciales || 'CJ'}</Text>
                </View>
                <View style={styles.identityInfo}>
                  <Text style={styles.identityName}>
                    {vm.perfil?.nombre || vm.nombre || 'Ciudadano'}
                  </Text>
                  <Text style={styles.identityEmail}>{vm.perfil?.email || vm.email}</Text>
                  <View style={styles.badgesRow}>
                    <RoleBadge
                      idRol={vm.perfil?.idRol || 1}
                      idDepartamento={vm.perfil?.idDepartamento}
                    />
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>
                        ID #{vm.perfil?.idUsuario ?? 1} • Cuenta activa
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 3. Resumen de Participación Ciudadana (solo Ciudadano Rol 1) */}
              {!esTrabajador && (
                <View style={styles.card}>
                  <Text accessibilityRole="header" style={styles.cardTitle}>
                    Mi participación ciudadana
                  </Text>
                  <Text style={styles.cardDescription}>
                    Resumen de reportes que has registrado en Mejora SJR.
                  </Text>

                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>{resumen.total}</Text>
                      <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>{resumen.recibidos}</Text>
                      <Text style={styles.statLabel}>Recibidos</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>{resumen.enProceso}</Text>
                      <Text style={styles.statLabel}>En atención</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>{resumen.resueltos}</Text>
                      <Text style={styles.statLabel}>Resueltos</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 4. Alertas de éxito o error */}
              {vm.mensajeExito && (
                <View style={styles.successBanner}>
                  <Text accessibilityRole="alert" style={styles.successText}>
                    {vm.mensajeExito}
                  </Text>
                </View>
              )}

              {vm.errors.general && (
                <View style={styles.errorBanner}>
                  <Text accessibilityRole="alert" style={styles.errorText}>
                    {vm.errors.general}
                  </Text>
                </View>
              )}

              {/* 5. Formulario de Información Personal (solo Ciudadano Rol 1) */}
              {!esTrabajador && (
                <View style={styles.card}>
                  <Text accessibilityRole="header" style={styles.cardTitle}>
                    Información personal
                  </Text>
                  <Text style={styles.cardDescription}>
                    Actualiza tu nombre o correo electrónico de contacto para tus reportes.
                  </Text>

                  <CustomInput
                    label="Nombre completo"
                    accessibilityLabel="Nombre completo del ciudadano"
                    placeholder="Ej. Juan Pérez"
                    value={vm.nombre}
                    onChangeText={vm.setNombre}
                    editable={!vm.isSaving}
                    hasError={Boolean(vm.errors.nombre)}
                    errorMessage={vm.errors.nombre}
                  />

                  <CustomInput
                    label="Correo electrónico"
                    accessibilityLabel="Correo electrónico del ciudadano"
                    placeholder="ejemplo@correo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={vm.email}
                    onChangeText={vm.setEmail}
                    editable={!vm.isSaving}
                    hasError={Boolean(vm.errors.email)}
                    errorMessage={vm.errors.email}
                  />
                </View>
              )}

              {/* 6. Sección de Cambio de Contraseña (siempre abierta para Trabajador Rol 2) */}
              <View style={styles.card}>
                <View style={styles.passwordHeader}>
                  <View style={styles.flex}>
                    <Text accessibilityRole="header" style={styles.cardTitle}>
                      {esTrabajador ? '🔐 Mi contraseña' : 'Seguridad de la cuenta'}
                    </Text>
                    <Text style={styles.cardDescription}>
                      {esTrabajador
                        ? 'Actualiza el acceso a tu cuenta. Usa al menos 8 caracteres y una clave diferente de la actual.'
                        : 'Opcional. Cambia tu contraseña de acceso si lo deseas.'}
                    </Text>
                  </View>
                  {!esTrabajador && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={
                        vm.mostrarCambioPassword
                          ? 'Cancelar cambio de contraseña'
                          : 'Cambiar contraseña'
                      }
                      onPress={vm.toggleCambioPassword}
                      disabled={vm.isSaving}
                      style={styles.toggleButton}
                    >
                      <Text style={styles.toggleButtonText}>
                        {vm.mostrarCambioPassword ? 'Ocultar' : 'Cambiar clave'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {(esTrabajador || vm.mostrarCambioPassword) && (
                  <View style={styles.passwordFields}>
                    <CustomInput
                      label="Contraseña actual"
                      accessibilityLabel="Contraseña actual"
                      placeholder="Ingresa tu contraseña actual"
                      secureTextEntry
                      value={vm.passwordActual}
                      onChangeText={vm.setPasswordActual}
                      editable={!vm.isSaving}
                      hasError={Boolean(vm.errors.passwordActual)}
                      errorMessage={vm.errors.passwordActual}
                    />

                    <CustomInput
                      label="Nueva contraseña"
                      accessibilityLabel="Nueva contraseña"
                      placeholder="Mínimo 8 caracteres"
                      secureTextEntry
                      value={vm.passwordNueva}
                      onChangeText={vm.setPasswordNueva}
                      editable={!vm.isSaving}
                      hasError={Boolean(vm.errors.passwordNueva)}
                      errorMessage={vm.errors.passwordNueva}
                    />

                    <CustomInput
                      label="Confirmar nueva contraseña"
                      accessibilityLabel="Confirmar nueva contraseña"
                      placeholder="Repite tu nueva contraseña"
                      secureTextEntry
                      value={vm.confirmarPassword}
                      onChangeText={vm.setConfirmarPassword}
                      editable={!vm.isSaving}
                      hasError={Boolean(vm.errors.confirmarPassword)}
                      errorMessage={vm.errors.confirmarPassword}
                    />
                    {esTrabajador && (
                      <Text style={styles.cardDescription}>
                        Tu contraseña actual se usa para confirmar tu identidad antes del cambio.
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* 7. Botones de Acción */}
              <View style={styles.actionsCard}>
                <CustomButton
                  title={esTrabajador ? 'Actualizar contraseña' : 'Guardar mis datos'}
                  onPress={vm.guardarCambios}
                  isLoading={vm.isSaving}
                  disabled={vm.isSaving}
                />
                <CustomButton
                  title="Recargar datos"
                  variant="outline"
                  onPress={vm.recargarPerfil}
                  disabled={vm.isSaving}
                />
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  identityCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  identityInfo: { flex: 1, gap: 4 },
  identityName: { fontSize: 19, fontWeight: '700', color: COLORS.textInverse },
  identityEmail: { fontSize: 13, color: COLORS.textInverse, opacity: 0.9 },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  activeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  activeBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.textInverse },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  cardDescription: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  statBox: {
    flexGrow: 1,
    flexBasis: 110,
    backgroundColor: COLORS.primaryMuted,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  statNumber: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  successBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  successText: { fontSize: 14, fontWeight: '600', color: '#065F46' },
  errorBanner: {
    backgroundColor: COLORS.errorBackground,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  errorText: { fontSize: 14, color: COLORS.errorText },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  toggleButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  toggleButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  passwordFields: { marginTop: SPACING.xs, gap: SPACING.xs },
  actionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
});
