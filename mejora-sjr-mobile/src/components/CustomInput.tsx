/**
 * CustomInput.tsx
 * Componente de entrada de texto reutilizable con validación visual (US-003).
 * 
 * Regla de US-003: "login y registro con validación visual (rojo en error)".
 * Cuando hasError=true, aplica borde rojo (#EF4444), fondo de alerta suave (#FEF2F2)
 * y muestra el mensaje de error en color rojo (#DC2626).
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface CustomInputProps extends TextInputProps {
  label: string;
  hasError?: boolean;
  errorMessage?: string | null;
  helperText?: string;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  label,
  hasError = false,
  errorMessage,
  helperText,
  style,
  ...rest
}) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.label, hasError && styles.labelError]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          hasError ? styles.inputError : styles.inputNormal,
          style,
        ]}
        placeholderTextColor={hasError ? '#F87171' : COLORS.placeholder}
        {...rest}
      />
      {hasError && errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    letterSpacing: 0.3,
  },
  labelError: {
    color: COLORS.error,
  },
  input: {
    height: 48,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 15,
    borderWidth: 1.5,
  },
  inputNormal: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
  },
  inputError: {
    backgroundColor: COLORS.errorBackground,
    borderColor: COLORS.errorBorder,
    color: COLORS.errorText,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  errorIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
