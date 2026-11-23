import React, { useState } from 'react';
import {
  View, Text, Modal, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, Image, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { useReportesCiudadanoViewModel } from '../viewModels/useReportesCiudadanoViewModel';
import { CustomButton } from '../components/CustomButton';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface Props { viewModel: ReturnType<typeof useReportesCiudadanoViewModel>['lista'] }

/**
 * Vista de Mis Reportes para el Ciudadano (US-024 / US-036).
 * Permite al ciudadano consultar el estado de avance en tiempo real de sus solicitudes,
 * con semáforo de estatus, línea de progreso de 4 pasos (Recibido -> Revisión -> En curso -> Atendido)
 * y visualización de la fotografía de evidencia inicial.
 */
export function MisReportesView({ viewModel: vm }: Props) {
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  const renderProgresoStepper = (pasoActual: number, idEstado: number) => {
    if (idEstado === 5) {
      return (
        <View style={styles.rechazadoBanner}>
          <Text style={styles.rechazadoText}>⛔ Reporte rechazado o descartado por personal municipal</Text>
        </View>
      );
    }

    const pasos = [
      { id: 1, label: 'Recibido' },
      { id: 2, label: 'En revisión' },
      { id: 3, label: 'En curso' },
      { id: 4, label: 'Atendido' },
    ];

    return (
      <View style={styles.stepperContainer}>
        <Text style={styles.stepperHeaderTitle}>Línea de avance del reporte:</Text>
        <View style={styles.stepperRow}>
          {pasos.map((paso, index) => {
            const completado = pasoActual >= paso.id;
            const esActual = pasoActual === paso.id;
            return (
              <React.Fragment key={paso.id}>
                <View style={styles.stepNodeWrapper}>
                  <View
                    style={[
                      styles.stepCircle,
                      completado && styles.stepCircleActive,
                      esActual && styles.stepCircleCurrent,
                      paso.id === 4 && completado && styles.stepCircleCompletedGreen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepNumber,
                        completado && styles.stepNumberActive,
                      ]}
                    >
                      {completado ? '✓' : paso.id}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      completado && styles.stepLabelActive,
                      esActual && styles.stepLabelCurrent,
                    ]}
                    numberOfLines={1}
                  >
                    {paso.label}
                  </Text>
                </View>
                {index < pasos.length - 1 && (
                  <View
                    style={[
                      styles.stepConnector,
                      pasoActual > paso.id && styles.stepConnectorActive,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={vm.visible} animationType="slide" onRequestClose={vm.cerrar}>
      <SafeAreaView style={styles.screen}>
        {/* Cabecera Principal */}
        <View style={styles.header}>
          <View style={styles.headerTitleGroup}>
            <Text accessibilityRole="header" style={styles.title}>Mis reportes</Text>
            <Text style={styles.subtitle}>Consulta el estado y seguimiento de tus solicitudes</Text>
          </View>
          <CustomButton title="Volver" variant="outline" onPress={vm.cerrar} />
        </View>

        {/* Resumen Métrico de Reportes */}
        {vm.conteoEstados && (
          <View style={styles.summaryBar}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{vm.conteoEstados.total}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Text style={[styles.summaryValue, { color: '#B45309' }]}>
                {vm.conteoEstados.enSeguimiento}
              </Text>
              <Text style={[styles.summaryLabel, { color: '#92400E' }]}>En proceso</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
              <Text style={[styles.summaryValue, { color: '#15803D' }]}>
                {vm.conteoEstados.atendidas}
              </Text>
              <Text style={[styles.summaryLabel, { color: '#166534' }]}>Atendidos</Text>
            </View>
          </View>
        )}

        {/* Pestañas de Filtro Rápido */}
        {vm.setFiltroEstado && vm.conteoEstados && (
          <View style={styles.filterTabsRow}>
            <TouchableOpacity
              style={[styles.filterTab, vm.filtroEstado === 'TODAS' && styles.filterTabActive]}
              onPress={() => vm.setFiltroEstado('TODAS')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, vm.filtroEstado === 'TODAS' && styles.filterTabTextActive]}>
                Todas ({vm.conteoEstados.total})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, vm.filtroEstado === 'EN_CURSO' && styles.filterTabActive]}
              onPress={() => vm.setFiltroEstado('EN_CURSO')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, vm.filtroEstado === 'EN_CURSO' && styles.filterTabTextActive]}>
                En proceso ({vm.conteoEstados.enSeguimiento})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, vm.filtroEstado === 'ATENDIDAS' && styles.filterTabActive]}
              onPress={() => vm.setFiltroEstado('ATENDIDAS')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, vm.filtroEstado === 'ATENDIDAS' && styles.filterTabTextActive]}>
                Atendidas ({vm.conteoEstados.atendidas})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botón de recarga */}
        <View style={styles.actionsRow}>
          <Text style={styles.actionsNote}>Información sincronizada con el municipio</Text>
          <CustomButton title="Actualizar" variant="outline" onPress={vm.recargar} isLoading={vm.isLoading} />
        </View>

        {vm.requiereComprobacion && (
          <View style={styles.notice}>
            <Text style={styles.note}>Comprueba si el reporte ya está registrado. Confirma una coincidencia solo si corresponde a tu borrador; no se volverá a enviar.</Text>
          </View>
        )}

        {vm.error && (
          <View style={styles.notice}>
            <Text accessibilityRole="alert" style={styles.error}>{vm.error}</Text>
          </View>
        )}

        {vm.isLoading ? (
          <ActivityIndicator style={styles.loading} size="large" color={COLORS.primary} />
        ) : (
          <FlatList
            data={vm.filas}
            keyExtractor={fila => String(fila.reporte.idIncidencia)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={!vm.error ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>
                  {vm.requiereComprobacion
                    ? 'Búsqueda de coincidencias'
                    : 'Sin reportes en esta sección'}
                </Text>
                <Text style={styles.emptyText}>
                  {vm.requiereComprobacion
                    ? 'Todavía no encontramos una coincidencia. Actualiza más tarde; la ausencia no confirma que el envío haya fallado.'
                    : vm.filtroEstado !== 'TODAS'
                    ? 'No se encontraron reportes con el filtro seleccionado.'
                    : 'Aún no tienes reportes ciudadanos registrados. Levanta un nuevo reporte desde la pantalla principal.'}
                </Text>
              </View>
            ) : undefined}
            renderItem={({ item }) => (
              <View style={styles.card}>
                {/* Cabecera de la tarjeta: ID y Badge de Estado */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardIdBadge}>
                    <Text style={styles.number}>Reporte #{item.reporte.idIncidencia}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: item.estadoBg || '#F1F5F9',
                        borderColor: item.estadoColor || '#CBD5E1',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: item.estadoColor || '#64748B' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.state,
                        { color: item.estadoColor || COLORS.primary },
                      ]}
                    >
                      {item.estadoNombre}
                    </Text>
                  </View>
                </View>

                {/* Categoría y Descripción */}
                <View style={styles.categoryContainer}>
                  <Text style={styles.categoryBadge}>{item.categoriaNombre}</Text>
                </View>
                <Text style={styles.description}>{item.reporte.descripcion}</Text>

                {/* Fotografía de Evidencia Inicial si existe */}
                {item.fotoInicialUrl && (
                  <TouchableOpacity
                    style={styles.evidenceThumbWrapper}
                    onPress={() => setFotoAmpliada(item.fotoInicialUrl)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Ver fotografía de evidencia del reporte en tamaño completo"
                  >
                    <Image
                      source={{ uri: item.fotoInicialUrl }}
                      style={styles.evidenceThumb}
                      resizeMode="cover"
                    />
                    <View style={styles.evidenceOverlayBadge}>
                      <Text style={styles.evidenceOverlayText}>🔍 Toca para ampliar evidencia</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Línea de Avance / Stepper Visual */}
                {renderProgresoStepper(item.pasoActual ?? 1, item.idEstado)}

                {/* Mensaje Explicativo del Estado */}
                <View
                  style={[
                    styles.statusCallout,
                    {
                      backgroundColor: item.estadoBg || '#F8FAFC',
                      borderColor: item.estadoColor || '#E2E8F0',
                    },
                  ]}
                >
                  <Text style={[styles.statusCalloutTitle, { color: item.estadoColor || '#1E293B' }]}>
                    {item.idEstado === 4
                      ? '✅ Reporte Atendido'
                      : item.idEstado === 3
                      ? '⚡ Cuadrilla en Atención'
                      : item.idEstado === 2
                      ? '🔍 En Revisión Técnica'
                      : item.idEstado === 5
                      ? '❌ Rechazado'
                      : '📥 Solicitud Recibida'}
                  </Text>
                  <Text style={styles.statusCalloutText}>{item.mensajeExplicativo}</Text>
                </View>

                {/* Fecha y comprobación */}
                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>📅 Registrado: {item.fechaTexto}</Text>
                </View>

                {item.puedeConfirmar && (
                  <CustomButton
                    title="Este reporte ya está guardado"
                    onPress={() => vm.confirmarExistente(item.reporte.idIncidencia)}
                  />
                )}
              </View>
            )}
          />
        )}

        {/* Modal de Visor de Fotografía en Pantalla Completa */}
        <Modal
          visible={fotoAmpliada !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setFotoAmpliada(null)}
        >
          <View style={styles.photoModalOverlay}>
            <View style={styles.photoModalContent}>
              <View style={styles.photoModalHeader}>
                <Text style={styles.photoModalTitle}>Evidencia fotográfica</Text>
                <TouchableOpacity
                  style={styles.photoModalCloseBtn}
                  onPress={() => setFotoAmpliada(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar visor de fotografía"
                >
                  <Text style={styles.photoModalCloseText}>✕ Cerrar</Text>
                </TouchableOpacity>
              </View>
              {fotoAmpliada && (
                <Image
                  source={{ uri: fotoAmpliada }}
                  style={styles.photoModalImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleGroup: { flex: 1, paddingRight: SPACING.sm },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  // Barra de Resumen Métrico
  summaryBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 2 },

  // Pestañas de Filtro
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  actionsNote: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },

  list: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xl },
  card: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    gap: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIdBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  number: { color: COLORS.primary, fontSize: 15, fontWeight: '800' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  state: { fontWeight: '700', fontSize: 13 },

  categoryContainer: { flexDirection: 'row' },
  categoryBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  description: { color: '#334155', fontSize: 15, lineHeight: 22 },

  // Miniatura de Evidencia
  evidenceThumbWrapper: {
    height: 140,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  evidenceThumb: { width: '100%', height: '100%' },
  evidenceOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  evidenceOverlayText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  // Stepper Visual
  stepperContainer: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 2,
  },
  stepperHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNodeWrapper: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
  },
  stepCircleCurrent: {
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  stepCircleCompletedGreen: {
    backgroundColor: '#16A34A',
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  stepLabelCurrent: {
    fontWeight: '800',
  },
  stepConnector: {
    flex: 1,
    height: 3,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
    marginHorizontal: -4,
  },
  stepConnectorActive: {
    backgroundColor: COLORS.primary,
  },

  rechazadoBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
    borderWidth: 1,
    padding: 8,
    borderRadius: RADIUS.md,
  },
  rechazadoText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Callout de estado
  statusCallout: {
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  statusCalloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusCalloutText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 2,
  },
  dateText: { fontSize: 12, color: '#64748B' },
  note: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21 },
  notice: {
    padding: SPACING.md,
    backgroundColor: COLORS.accentLight,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  error: { color: COLORS.errorText, fontSize: 14, lineHeight: 21 },
  loading: { marginTop: SPACING.xl },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },

  // Modal de Foto
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  photoModalContent: {
    width: '100%',
    height: '80%',
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  photoModalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  photoModalCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#334155',
    borderRadius: RADIUS.md,
  },
  photoModalCloseText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  photoModalImage: { width: '100%', height: '100%' },
});
