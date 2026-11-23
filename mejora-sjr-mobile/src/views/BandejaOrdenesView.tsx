import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { useBandejaViewModel } from '../viewModels/useBandejaViewModel';
import type { EstadoVisualTarea, TareaBandeja } from '../models/bandeja.types';
import { CustomButton } from '../components/CustomButton';
import { RoleBadge } from '../components/RoleBadge';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface BandejaOrdenesViewProps { viewModel: ReturnType<typeof useBandejaViewModel> }

interface TareaCardProps {
  tarea: TareaBandeja;
  esDemostracion?: boolean;
  onVerFoto: (url: string, id: number) => void;
  onCambiarEstado: (idIncidencia: number, nuevoEstado: number) => void;
  estaActualizando: boolean;
}

const estadoColores: Record<EstadoVisualTarea, { background: string; text: string }> = {
  recibida: { background: COLORS.background, text: COLORS.textSecondary },
  revision: { background: COLORS.accentLight, text: COLORS.primary },
  progreso: { background: COLORS.primaryMuted, text: COLORS.primary },
  atendida: { background: COLORS.successBackground, text: COLORS.successText },
  rechazada: { background: COLORS.errorBackground, text: COLORS.errorText },
  desconocido: { background: COLORS.background, text: COLORS.textSecondary },
};

/** Tarjeta interactiva: visualiza detalles, fotografía de evidencia y acciones operativas de estado. */
function TareaCard({ tarea, esDemostracion, onVerFoto, onCambiarEstado, estaActualizando }: TareaCardProps) {
  const colors = estadoColores[tarea.estadoVisual];
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeading}>
        <View style={styles.taskReference}>
          <Text style={styles.taskEyebrow}>{esDemostracion ? 'TAREA DE EJEMPLO' : 'ORDEN DE TRABAJO'}</Text>
          <Text style={styles.taskNumber}>#{tarea.idIncidencia}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: colors.background }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>{tarea.estadoLabel}</Text>
        </View>
      </View>
      <Text accessibilityRole="header" style={styles.taskTitle}>{tarea.categoria}</Text>
      <Text style={styles.taskDescription}>{tarea.descripcion}</Text>

      {/* Evidencia fotográfica */}
      {tarea.fotoInicialUrl ? (
        <View style={styles.photoContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onVerFoto(tarea.fotoInicialUrl!, tarea.idIncidencia)}
            style={styles.photoButton}
            accessibilityRole="button"
            accessibilityLabel={`Ver fotografía de evidencia para el reporte #${tarea.idIncidencia}`}
          >
            <Image
              source={{ uri: tarea.fotoInicialUrl }}
              style={styles.photoThumbnail}
              resizeMode="cover"
            />
            <View style={styles.photoOverlayBadge}>
              <Text style={styles.photoOverlayText}>🔍 Toca para ampliar evidencia</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noPhotoContainer}>
          <Text style={styles.noPhotoText}>📷 Sin fotografía adjunta en el reporte</Text>
        </View>
      )}

      <View style={styles.taskDetails}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Ubicación</Text>
          <Text style={styles.detailValue}>{tarea.direccion}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Reportante</Text>
          <Text style={styles.detailValue}>{tarea.reportante}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>{esDemostracion ? 'Fecha del ejemplo' : 'Fecha de reporte'}</Text>
          <Text style={styles.detailValue}>{tarea.fecha}</Text>
        </View>
      </View>

      {/* Acciones operativas de cambio de estado en campo */}
      {!esDemostracion && (
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Estado de atención en campo:</Text>
          <View style={styles.actionButtonsRow}>
            {tarea.idEstado === 2 && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnProgress]}
                  disabled={estaActualizando}
                  onPress={() => onCambiarEstado(tarea.idIncidencia, 3)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Poner orden en marcha"
                >
                  {estaActualizando ? (
                    <ActivityIndicator size="small" color={COLORS.textInverse} />
                  ) : (
                    <Text style={styles.actionBtnProgressText}>▶️ Poner en marcha (En curso)</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSuccess]}
                  disabled={estaActualizando}
                  onPress={() => onCambiarEstado(tarea.idIncidencia, 4)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Marcar orden como atendida"
                >
                  <Text style={styles.actionBtnSuccessText}>✔️ Marcar Atendida</Text>
                </TouchableOpacity>
              </>
            )}

            {tarea.idEstado === 3 && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSuccess]}
                  disabled={estaActualizando}
                  onPress={() => onCambiarEstado(tarea.idIncidencia, 4)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Finalizar trabajo y marcar como atendida"
                >
                  {estaActualizando ? (
                    <ActivityIndicator size="small" color={COLORS.textInverse} />
                  ) : (
                    <Text style={styles.actionBtnSuccessText}>✔️ Finalizar y Atender</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnOutline]}
                  disabled={estaActualizando}
                  onPress={() => onCambiarEstado(tarea.idIncidencia, 2)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Regresar orden a en revisión"
                >
                  <Text style={styles.actionBtnOutlineText}>↩️ En revisión</Text>
                </TouchableOpacity>
              </>
            )}

            {tarea.idEstado === 4 && (
              <View style={styles.completedNotice}>
                <Text style={styles.completedNoticeText}>✅ Reporte atendido y cerrado</Text>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnOutline, { marginTop: SPACING.xs }]}
                  disabled={estaActualizando}
                  onPress={() => onCambiarEstado(tarea.idIncidencia, 3)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Reabrir atención de esta orden"
                >
                  <Text style={styles.actionBtnOutlineText}>Reanudar atención</Text>
                </TouchableOpacity>
              </View>
            )}

            {tarea.idEstado !== 2 && tarea.idEstado !== 3 && tarea.idEstado !== 4 && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnProgress]}
                disabled={estaActualizando}
                onPress={() => onCambiarEstado(tarea.idIncidencia, 3)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={styles.actionBtnProgressText}>▶️ Iniciar atención</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

/** Pantalla de consulta e interacción operativa de campo: visualización de fotos y gestión de estados. */
export function BandejaOrdenesView({ viewModel: vm }: BandejaOrdenesViewProps) {
  const [fotoSeleccionada, setFotoSeleccionada] = useState<{ url: string; id: number } | null>(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.brand}>
            <View style={styles.brandMark} accessible={false}><Text style={styles.brandMarkText}>SJR</Text></View>
            <View style={styles.brandText}>
              <Text style={styles.brandName}>Mejora SJR</Text>
              <Text style={styles.brandCaption}>San Juan del Río</Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button" accessibilityLabel="Cerrar sesión"
            onPress={vm.cerrarSesion} style={styles.logoutButton} activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={vm.tareas} keyExtractor={(tarea) => String(tarea.idIncidencia)}
        renderItem={({ item }) => (
          <TareaCard
            tarea={item}
            esDemostracion={vm.esDemostracion}
            onVerFoto={(url, id) => setFotoSeleccionada({ url, id })}
            onCambiarEstado={(id, nuevoEstado) => vm.cambiarEstadoTarea(id, nuevoEstado)}
            estaActualizando={vm.actualizandoId === item.idIncidencia}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
        accessibilityLabel={vm.esDemostracion ? "Lista de tareas de demostración asignadas" : "Lista de órdenes de trabajo asignadas"}
        ListHeaderComponent={(
          <View style={styles.listHeader}>
            <View style={styles.profileRow}>
              <Text style={styles.userName}>{vm.session?.nombre || 'Trabajador'}</Text>
              <RoleBadge idRol={vm.session?.idRol || 2} idDepartamento={vm.session?.idDepartamento} />
            </View>

            {vm.mensajeOperacion && (
              <View style={styles.toastSuccess}>
                <Text style={styles.toastSuccessText}>{vm.mensajeOperacion}</Text>
              </View>
            )}
            {vm.errorOperacion && (
              <View style={styles.toastError}>
                <Text style={styles.toastErrorText}>{vm.errorOperacion}</Text>
              </View>
            )}

            <View style={styles.hero}>
              <View style={styles.heroAccent} />
              <Text style={styles.eyebrow}>ESPACIO DEL TRABAJADOR</Text>
              <Text accessibilityRole="header" style={styles.heroTitle}>Mis tareas</Text>
              <Text style={styles.heroDescription}>
                {vm.esDemostracion
                  ? 'Consulta los ejemplos asignados a tu usuario y explora sus estados.'
                  : 'Consulta las órdenes de trabajo asignadas a tu cuadrilla y actualiza su estado en campo.'}
              </Text>
            </View>

            {vm.esDemostracion && (
              <View style={styles.demoNotice}>
                <Text style={styles.demoTitle}>Demostración · Solo lectura</Text>
                <Text style={styles.demoText}>Los datos son de ejemplo. No representan asignaciones reales del municipio.</Text>
              </View>
            )}

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{vm.totalAsignadas}</Text><Text style={styles.metricLabel}>Asignadas</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{vm.pendientes}</Text><Text style={styles.metricLabel}>Por atender</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{vm.enCurso}</Text><Text style={styles.metricLabel}>En curso</Text>
              </View>
            </View>

            <View style={styles.filtersCard}>
              <Text accessibilityRole="header" style={styles.filtersTitle}>Filtrar por estado</Text>
              <View style={styles.filters}>
                {vm.filtros.map((filtro) => (
                  <TouchableOpacity
                    key={String(filtro.value)} accessibilityRole="button"
                    accessibilityLabel={`${filtro.label}, ${filtro.count} tareas`}
                    accessibilityState={{ selected: filtro.selected, disabled: vm.isLoading }}
                    disabled={vm.isLoading} onPress={() => vm.cambiarFiltro(filtro.value)}
                    style={[styles.filterChip, filtro.selected && styles.filterChipSelected]} activeOpacity={0.7}
                  >
                    <Text style={[styles.filterText, filtro.selected && styles.filterTextSelected]}>{filtro.label}</Text>
                    <Text style={[styles.filterCount, filtro.selected && styles.filterTextSelected]}>{filtro.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <CustomButton
              title={vm.esDemostracion ? "Actualizar ejemplos" : "Actualizar órdenes"}
              variant="outline" onPress={vm.recargar}
              disabled={!vm.puedeRecargar} accessibilityRole="button"
              accessibilityLabel={vm.esDemostracion ? "Volver a consultar las tareas de ejemplo asignadas" : "Volver a consultar las órdenes de trabajo asignadas"}
            />
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyCard}>
            {vm.listStatus === 'loading' ? (
              <>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text accessibilityLiveRegion="polite" style={styles.emptyTitle}>
                  {vm.esDemostracion ? 'Consultando ejemplos' : 'Consultando órdenes'}
                </Text>
                <Text style={styles.emptyMessage}>
                  {vm.esDemostracion
                    ? 'Preparando las tareas asignadas a tu usuario.'
                    : 'Cargando las órdenes de trabajo asignadas a tu cuadrilla.'}
                </Text>
              </>
            ) : vm.listStatus === 'error' ? (
              <>
                <Text style={styles.emptyTitle}>No se pudieron consultar las tareas</Text>
                <Text accessibilityRole="alert" style={styles.errorText}>{vm.error}</Text>
                <CustomButton
                  title="Reintentar" onPress={vm.recargar} disabled={!vm.puedeRecargar}
                  accessibilityRole="button"
                />
              </>
            ) : (
              <>
                <View style={styles.emptySymbol} accessible={false}><View style={styles.emptySymbolLine} /><View style={styles.emptySymbolLine} /></View>
                <Text accessibilityLiveRegion="polite" style={styles.emptyTitle}>{vm.emptyTitle}</Text>
                <Text style={styles.emptyMessage}>{vm.emptyMessage}</Text>
              </>
            )}
          </View>
        )}
        ListFooterComponent={
          <Text style={styles.footerText}>
            {vm.esDemostracion
              ? 'Consulta de demostración. No permite modificar estados.'
              : 'Bandeja operativa de cuadrilla · San Juan del Río'}
          </Text>
        }
      />

      {/* Modal visor de fotografía de evidencia */}
      <Modal
        visible={fotoSeleccionada !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoSeleccionada(null)}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>EVIDENCIA CIUDADANA</Text>
                <Text style={styles.modalTitle}>Reporte #{fotoSeleccionada?.id}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setFotoSeleccionada(null)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cerrar visor de fotografía"
              >
                <Text style={styles.modalCloseText}>✕ Cerrar</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalImageWrapper}>
              {fotoSeleccionada && (
                <Image
                  source={{ uri: fotoSeleccionada.url }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerContent: { width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.md },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minWidth: 0 },
  brandMark: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: COLORS.accent },
  brandMarkText: { fontSize: 13, fontWeight: '800', color: COLORS.textInverse },
  brandText: { flex: 1, minWidth: 0 },
  brandName: { fontSize: 17, fontWeight: '700', color: COLORS.primary },
  brandCaption: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  logoutButton: { minHeight: 48, minWidth: 64, paddingHorizontal: SPACING.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md },
  logoutText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  listContent: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: SPACING.md, paddingBottom: SPACING.xl },
  listHeader: { gap: SPACING.md, marginBottom: SPACING.md },
  profileRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  userName: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: COLORS.textSecondary, flexShrink: 1 },
  hero: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.lg },
  heroAccent: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.accent, marginBottom: SPACING.md },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, color: COLORS.textInverse },
  heroTitle: { fontSize: 29, lineHeight: 37, fontWeight: '700', color: COLORS.textInverse, marginTop: SPACING.sm },
  heroDescription: { fontSize: 15, lineHeight: 23, color: COLORS.textInverse, marginTop: SPACING.sm },
  demoNotice: { padding: SPACING.md, gap: SPACING.xs, backgroundColor: COLORS.accentLight, borderLeftWidth: 4, borderLeftColor: COLORS.accent, borderRadius: RADIUS.md },
  demoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  demoText: { fontSize: 14, lineHeight: 21, color: COLORS.textPrimary },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  metric: { flexGrow: 1, flexBasis: 82, padding: SPACING.sm, gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  metricValue: { fontSize: 26, fontWeight: '700', color: COLORS.primary },
  metricLabel: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  filtersCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md },
  filtersTitle: { fontSize: 17, lineHeight: 23, fontWeight: '700', color: COLORS.textPrimary },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  filterChip: { minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.background },
  filterChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: COLORS.textSecondary, flexShrink: 1 },
  filterCount: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  filterTextSelected: { color: COLORS.textInverse },
  separator: { height: SPACING.md },
  taskCard: { padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface },
  taskHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm },
  taskReference: { flexGrow: 1, flexBasis: 110 },
  taskEyebrow: { fontSize: 10, letterSpacing: 0.8, fontWeight: '700', color: COLORS.textSecondary },
  taskNumber: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginTop: SPACING.xs },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, lineHeight: 19, fontWeight: '700' },
  taskTitle: { fontSize: 19, lineHeight: 26, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  taskDescription: { fontSize: 15, lineHeight: 23, color: COLORS.textSecondary, marginTop: SPACING.sm },

  // Evidencias fotográficas
  photoContainer: { marginTop: SPACING.md, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  photoButton: { position: 'relative' },
  photoThumbnail: { width: '100%', height: 180, backgroundColor: COLORS.background },
  photoOverlayBadge: { position: 'absolute', bottom: SPACING.sm, right: SPACING.sm, backgroundColor: 'rgba(0, 0, 0, 0.72)', paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: RADIUS.full },
  photoOverlayText: { color: COLORS.textInverse, fontSize: 12, fontWeight: '600' },
  noPhotoContainer: { marginTop: SPACING.sm, padding: SPACING.sm, backgroundColor: COLORS.background, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  noPhotoText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  taskDetails: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, gap: SPACING.md },
  detail: { gap: SPACING.xs },
  detailLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  detailValue: { fontSize: 14, lineHeight: 21, color: COLORS.textPrimary },

  // Botones y acciones de cambio de estado
  actionsContainer: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, gap: SPACING.xs },
  actionsTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  actionButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  actionBtn: { flexGrow: 1, minHeight: 46, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  actionBtnProgress: { backgroundColor: COLORS.primary },
  actionBtnProgressText: { color: COLORS.textInverse, fontWeight: '700', fontSize: 13 },
  actionBtnSuccess: { backgroundColor: '#16a34a' },
  actionBtnSuccessText: { color: COLORS.textInverse, fontWeight: '700', fontSize: 13 },
  actionBtnOutline: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  actionBtnOutlineText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
  completedNotice: { width: '100%', padding: SPACING.sm, backgroundColor: COLORS.successBackground, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#16a34a' },
  completedNoticeText: { color: '#16a34a', fontWeight: '700', fontSize: 13, textAlign: 'center' },

  // Avisos y notificaciones operativas
  toastSuccess: { padding: SPACING.md, backgroundColor: COLORS.successBackground, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#16a34a', marginBottom: SPACING.xs },
  toastSuccessText: { color: '#16a34a', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  toastError: { padding: SPACING.md, backgroundColor: COLORS.errorBackground, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.errorText, marginBottom: SPACING.xs },
  toastErrorText: { color: COLORS.errorText, fontWeight: '700', fontSize: 13, textAlign: 'center' },

  // Modal visor de fotos
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.92)' },
  modalContainer: { flex: 1, justifyContent: 'space-between' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md },
  modalEyebrow: { fontSize: 11, fontWeight: '700', color: COLORS.accent, letterSpacing: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textInverse, marginTop: 2 },
  modalCloseButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: RADIUS.full },
  modalCloseText: { color: COLORS.textInverse, fontWeight: '700', fontSize: 14 },
  modalImageWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.sm },
  modalImage: { width: '100%', height: '100%' },

  emptyCard: { padding: SPACING.lg, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface },
  emptyTitle: { fontSize: 19, lineHeight: 26, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  emptyMessage: { fontSize: 14, lineHeight: 22, color: COLORS.textSecondary, textAlign: 'center' },
  emptySymbol: { width: 40, height: 46, borderWidth: 2, borderColor: COLORS.primaryLight, borderRadius: 8, alignSelf: 'center', padding: SPACING.sm, justifyContent: 'center', gap: 6 },
  emptySymbolLine: { height: 2, backgroundColor: COLORS.primaryLight },
  errorText: { fontSize: 14, lineHeight: 22, color: COLORS.errorText, textAlign: 'center' },
  footerText: { fontSize: 13, lineHeight: 21, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.lg },
});
