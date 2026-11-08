import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CustomButton } from '../components/CustomButton';
import { COLORS, SPACING } from '../constants/theme';

interface SessionClosingViewProps {
  error: string | null;
  isBusy: boolean;
  onRetry: () => void;
}

/** Representa el cierre pendiente o fallido; no restaura sesiones ni abre el login. */
export function SessionClosingView({ error, isBusy, onRetry }: SessionClosingViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cerrando sesión</Text>
      {isBusy && <ActivityIndicator size="large" color={COLORS.primary} />}
      <Text style={styles.message}>Estamos eliminando la sesión anterior antes de continuar.</Text>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {error && <CustomButton title="Reintentar cierre" onPress={onRetry} disabled={isBusy} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: SPACING.xl, gap: SPACING.lg, backgroundColor: COLORS.background },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  message: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center' },
  error: { fontSize: 14, color: COLORS.errorText, textAlign: 'center' },
});
