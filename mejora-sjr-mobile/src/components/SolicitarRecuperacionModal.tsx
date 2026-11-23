/**
 * SolicitarRecuperacionModal.tsx
 * Modal para solicitar recuperación asistida de contraseña desde la app móvil (US-028 / US-029).
 */

import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import type { ISolicitudRecuperacionService } from '../services/contracts/ISolicitudRecuperacionService';
import { SolicitudRecuperacionApiService } from '../services/api/SolicitudRecuperacionApiService';
import { useSolicitarRecuperacionViewModel } from '../viewModels/useSolicitarRecuperacionViewModel';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialEmail?: string;
  recuperacionService?: ISolicitudRecuperacionService;
}

export const SolicitarRecuperacionModal: React.FC<Props> = ({
  visible,
  onClose,
  initialEmail = '',
  recuperacionService,
}) => {
  const service = useMemo<ISolicitudRecuperacionService>(
    () => recuperacionService ?? new SolicitudRecuperacionApiService(),
    [recuperacionService]
  );

  const {
    email,
    setEmail,
    isLoading,
    successMessage,
    errorMessage,
    setErrorMessage,
    handleSubmit,
    resetMessages,
  } = useSolicitarRecuperacionViewModel(service, initialEmail, visible);

  const handleClose = () => {
    resetMessages();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🔐</Text>
            </View>
            <Text style={styles.title}>Recuperar Contraseña</Text>
            <Text style={styles.subtitle}>
              Envía una solicitud de restablecimiento asistido al Superadministrador.
            </Text>
          </View>

          {/* Estado de Éxito */}
          {successMessage ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>¡Solicitud Enviada!</Text>
              <Text style={styles.successText}>{successMessage}</Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Formulario */
            <View style={styles.body}>
              {errorMessage && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Correo de la Cuenta</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errorMessage ? styles.textInputError : styles.textInputNormal,
                ]}
                placeholder="ejemplo@test.com"
                placeholderTextColor={COLORS.placeholder}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />

              <Text style={styles.hintText}>
                Un Superadministrador verificará tu identidad y emitirá una contraseña provisional.
              </Text>

              {/* Botones de acción */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Enviar Solicitud</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    width: '100%',
    maxWidth: 380,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  iconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  body: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  textInput: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  textInputNormal: {
    borderColor: COLORS.border,
  },
  textInputError: {
    borderColor: COLORS.errorBorder,
    backgroundColor: COLORS.errorBackground,
  },
  hintText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
    lineHeight: 15,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBackground,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: RADIUS.sm,
    padding: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  errorIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.errorText,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  successIcon: {
    fontSize: 40,
    marginBottom: SPACING.xs,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  successText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: SPACING.lg,
  },
});
