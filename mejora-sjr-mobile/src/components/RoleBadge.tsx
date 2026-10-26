/**
 * RoleBadge.tsx
 * Insignia visual que muestra el perfil de usuario y la dependencia municipal asignada.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { ROLES_SJR, DEPARTAMENTOS_SJR, TipoRol, TipoDepartamento } from '../models/auth.types';

interface RoleBadgeProps {
  idRol: number;
  idDepartamento?: number | null;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ idRol, idDepartamento }) => {
  const rolTexto = ROLES_SJR[idRol as TipoRol] || `Rol ${idRol}`;
  const deptoTexto = idDepartamento
    ? DEPARTAMENTOS_SJR[idDepartamento as TipoDepartamento] || `Depto ${idDepartamento}`
    : null;

  const getBadgeStyle = () => {
    switch (idRol) {
      case 1: // Ciudadano
        return { bg: '#E0F2FE', text: '#0369A1' };
      case 2: // Trabajador
        return { bg: '#FEF3C7', text: '#B45309' };
      case 3: // Admin
        return { bg: '#F1F5F9', text: '#334155' };
      case 4: // Superadmin
        return { bg: '#FCE7F3', text: '#BE185D' };
      default:
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  const colors = getBadgeStyle();

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: colors.bg }]}>
        <Text style={[styles.badgeText, { color: colors.text }]}>{rolTexto}</Text>
      </View>
      {deptoTexto && (
        <View style={styles.deptoBadge}>
          <Text style={styles.deptoText}>{deptoTexto}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deptoBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deptoText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
