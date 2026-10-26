/**
 * QuickCredentialsDrawer.tsx
 * Panel desplegable para pruebas rápidas multirrol en evaluaciones y revisiones de sprint.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface QuickCredentialsDrawerProps {
  onSelectAccount: (email: string) => void;
}

export const QuickCredentialsDrawer: React.FC<QuickCredentialsDrawerProps> = ({
  onSelectAccount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const testAccounts = [
    {
      label: 'Ciudadano (Rol 1)',
      email: 'ciudadano@test.com',
      desc: 'Va a "Crear Reporte"',
      badgeColor: '#0284C7',
    },
    {
      label: 'Trabajador (Rol 2)',
      email: 'trabajador@test.com',
      desc: 'Va a "Bandeja de Órdenes" (JAPAM)',
      badgeColor: '#D97706',
    },
    {
      label: 'Admin (Rol 3)',
      email: 'admin@test.com',
      desc: 'Servicios Públicos',
      badgeColor: '#475569',
    },
    {
      label: 'Superadmin (Rol 4)',
      email: 'superadmin@test.com',
      desc: 'Gestión Global',
      badgeColor: '#9333EA',
    },
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleIcon}>{isExpanded ? '▼' : '▶'}</Text>
        <Text style={styles.toggleText}>
          ⚡ Cuentas Semilla para Pruebas Rápidas (Evaluación)
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.drawerContent}>
          <Text style={styles.helpText}>
            Toca una cuenta para autocompletar credenciales (Contraseña: Password123!):
          </Text>
          <View style={styles.buttonsGrid}>
            {testAccounts.map((acc) => (
              <TouchableOpacity
                key={acc.email}
                style={styles.accountCard}
                onPress={() => onSelectAccount(acc.email)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardBadge, { color: acc.badgeColor }]}>
                    ● {acc.label}
                  </Text>
                </View>
                <Text style={styles.cardEmail}>{acc.email}</Text>
                <Text style={styles.cardDesc}>{acc.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: SPACING.md,
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: '#E2E8F0',
  },
  toggleIcon: {
    fontSize: 10,
    marginRight: SPACING.xs,
    color: COLORS.primary,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  drawerContent: {
    padding: SPACING.sm,
  },
  helpText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  buttonsGrid: {
    gap: SPACING.xs,
  },
  accountCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardEmail: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
