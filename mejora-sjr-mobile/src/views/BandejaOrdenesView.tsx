/**
 * BandejaOrdenesView.tsx
 * Pantalla de "Bandeja de Órdenes de Trabajo" para Trabajadores de Campo (Rol 2) (US-003).
 * 
 * Regla de US-003:
 * - Si el JWT decodificado tiene IdRol=2, se redirige automáticamente a esta pantalla.
 * - Muestra las incidencias operativas asignadas según el departamento del trabajador (JAPAM o Servicios Públicos).
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useBandejaViewModel } from '../viewModels/useBandejaViewModel';
import { RoleBadge } from '../components/RoleBadge';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { ESTADOS_INCIDENCIA } from '../models/incidencia.types';

export const BandejaOrdenesView: React.FC = () => {
  const {
    session,
    ordenes,
    totalOrdenes,
    filtroEstado,
    setFiltroEstado,
    handleCambiarEstado,
    cerrarSesion,
  } = useBandejaViewModel();

  const filtros = [
    { label: 'Todas', value: null },
    { label: 'Recibido', value: 1 },
    { label: 'En Revisión', value: 2 },
    { label: 'En Progreso', value: 3 },
    { label: 'Atendido', value: 4 },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Barra Superior del Trabajador */}
      <View style={styles.topBar}>
        <View style={styles.userProfile}>
          <Text style={styles.userName}>{session?.nombre || 'Trabajador de Campo'}</Text>
          <RoleBadge idRol={session?.idRol || 2} idDepartamento={session?.idDepartamento} />
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={cerrarSesion}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Operativo */}
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerTitle}>Bandeja de Órdenes de Trabajo</Text>
          <Text style={styles.bannerSubtitle}>
            Atención de reportes ciudadanos asignados a tu cuadrilla en San Juan del Río.
          </Text>
          <View style={styles.counterRow}>
            <Text style={styles.counterText}>
              Total visibles: <Text style={styles.counterNumber}>{ordenes.length}</Text> de {totalOrdenes}
            </Text>
          </View>
        </View>

        {/* Filtros de Estado */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {filtros.map((f) => {
            const isSelected = filtroEstado === f.value;
            return (
              <TouchableOpacity
                key={f.label}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                ]}
                onPress={() => setFiltroEstado(f.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lista de Órdenes */}
        {ordenes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No hay órdenes en este estado</Text>
            <Text style={styles.emptySubtitle}>
              Selecciona otro filtro para consultar más incidencias.
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {ordenes.map((orden) => {
              const estadoConfig =
                ESTADOS_INCIDENCIA[orden.idEstado as keyof typeof ESTADOS_INCIDENCIA] || {
                  nombre: orden.estadoNombre,
                  color: COLORS.primary,
                  bg: '#F1F5F9',
                };

              return (
                <View key={orden.idIncidencia} style={styles.orderCard}>
                  {/* Encabezado de la Tarjeta */}
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.orderFolio}>Folio #{orden.idIncidencia}</Text>
                      <Text style={styles.orderCategory}>{orden.categoriaNombre}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: estadoConfig.bg },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: estadoConfig.color }]}>
                        ● {estadoConfig.nombre}
                      </Text>
                    </View>
                  </View>

                  {/* Descripción */}
                  <Text style={styles.orderDesc}>{orden.descripcion}</Text>

                  {/* Ubicación y Reportante */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>📍</Text>
                    <Text style={styles.infoText}>{orden.direccionReferencia}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>👤</Text>
                    <Text style={styles.infoText}>Reportado por: {orden.ciudadanoNombre}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>🕒</Text>
                    <Text style={styles.infoText}>Fecha: {orden.fechaCreacion}</Text>
                  </View>

                  {/* Acciones de Flujo Operativo */}
                  <View style={styles.actionsContainer}>
                    {orden.idEstado !== 3 && orden.idEstado !== 4 && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.btnProgreso]}
                        onPress={() => handleCambiarEstado(orden.idIncidencia, 3)}
                      >
                        <Text style={styles.btnProgresoText}>▶ Iniciar Atención</Text>
                      </TouchableOpacity>
                    )}

                    {orden.idEstado === 3 && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.btnAtender]}
                        onPress={() => handleCambiarEstado(orden.idIncidencia, 4)}
                      >
                        <Text style={styles.btnAtenderText}>✓ Concluir / Atendido</Text>
                      </TouchableOpacity>
                    )}

                    {orden.idEstado === 4 && (
                      <View style={styles.resolvedBadge}>
                        <Text style={styles.resolvedText}>🎉 Incidencia Atendida y Resuelta</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userProfile: {
    gap: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  logoutButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '600',
  },
  scrollContent: {
    padding: SPACING.md,
  },
  bannerContainer: {
    backgroundColor: '#0A3D62',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#E0F2FE',
    marginTop: 4,
    lineHeight: 18,
  },
  counterRow: {
    marginTop: SPACING.sm,
  },
  counterText: {
    fontSize: 12,
    color: '#BAE6FD',
  },
  counterNumber: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filtersContainer: {
    paddingBottom: SPACING.md,
    gap: SPACING.xs,
  },
  filterChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextSelected: {
    color: COLORS.textInverse,
  },
  ordersList: {
    gap: SPACING.md,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  orderFolio: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryLight,
  },
  orderCategory: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionsContainer: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: SPACING.sm,
  },
  actionBtn: {
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  btnProgreso: {
    backgroundColor: '#DBEAFE',
  },
  btnProgresoText: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnAtender: {
    backgroundColor: '#DCFCE7',
  },
  btnAtenderText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
  },
  resolvedBadge: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  resolvedText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xxl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
