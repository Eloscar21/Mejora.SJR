import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { useReportesCiudadanoViewModel } from '../viewModels/useReportesCiudadanoViewModel';
import { CustomPicker } from '../components/CustomPicker';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { RoleBadge } from '../components/RoleBadge';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface ReportSectionProps {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

/** Agrupa contenido de presentación; no valida campos ni coordina servicios. */
function ReportSection({ number, title, description, children }: ReportSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>{number}</Text></View>
        <View style={styles.headingContent}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDescription}>{description}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

interface CrearReporteViewProps { viewModel: ReturnType<typeof useReportesCiudadanoViewModel>['formulario'] }

/** Presentación de US-024: envío real con ubicación e imagen de ejemplo explícitas. */
export const CrearReporteView: React.FC<CrearReporteViewProps> = ({ viewModel }) => {
  const {
    session, departamentosItems, categoriasItems, isLoadingCatalogos, errorCatalogos, catalogosDisponibles,
    selectedDepartamento, selectedCategoria, descripcion, referenciaUbicacion,
    coordenadas, fotoEvidencia, fotoIntento, estadoFoto, errors, isSubmitting, reporteCreado, cargarCatalogos,
    formularioBloqueado, puedeEnviar, puedeAdjuntarFoto,
    verMisReportes, mensajeComprobacion,
    handleDepartamentoChange, handleCategoriaChange, handleDescripcionChange,
    handleAdjuntarFoto, handleEliminarFoto, handleFotoCargada, handleFotoError, handleReintentarFoto,
    handleSubmitReporte, cerrarModalExito, cerrarSesion,
  } = viewModel;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.brand}>
              <View style={styles.brandMark} accessible={false}><Text style={styles.brandMarkText}>SJR</Text></View>
              <View style={styles.headingContent}>
                <Text style={styles.brandName}>Mejora SJR</Text>
                <Text style={styles.brandCaption}>San Juan del Río</Text>
              </View>
            </View>
            <CustomButton title="Mis reportes" variant="outline" onPress={verMisReportes} disabled={isSubmitting} />
            <TouchableOpacity
              accessibilityRole="button" accessibilityLabel="Cerrar sesión"
              style={styles.logoutButton} onPress={cerrarSesion} activeOpacity={0.7}
            >
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        >
          <View style={styles.content}>
            <View style={styles.profileRow}>
              <Text style={styles.userName}>{session?.nombre || 'Ciudadano'}</Text>
              <RoleBadge idRol={session?.idRol || 1} idDepartamento={session?.idDepartamento} />
            </View>

            <View style={styles.hero}>
              <View style={styles.heroAccent} />
              <Text style={styles.eyebrow}>ESPACIO CIUDADANO</Text>
              <Text accessibilityRole="header" style={styles.heroTitle}>Nuevo reporte</Text>
              <Text style={styles.heroDescription}>Cuéntanos qué ocurre y dónde se encuentra el problema.</Text>
            </View>

            <View style={styles.demoNotice}>
              <Text style={styles.demoTitle}>Ubicación y fotografía de ejemplo</Text>
              <Text style={styles.demoText}>Usaremos datos de ejemplo para la ubicación y la imagen. Al enviar, el reporte sí se guardará en el sistema.</Text>
            </View>

            {errorCatalogos && (
              <View style={styles.errorCard}>
                <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorText}>{errorCatalogos}</Text>
                <CustomButton
                  title="Reintentar catálogos" variant="outline" onPress={cargarCatalogos}
                  isLoading={isLoadingCatalogos} disabled={formularioBloqueado} accessibilityRole="button"
                />
              </View>
            )}
            {!isLoadingCatalogos && !errorCatalogos && !catalogosDisponibles && (
              <View style={styles.errorCard}>
                <Text accessibilityRole="alert" style={styles.errorText}>No hay catálogos disponibles para crear un reporte.</Text>
                <CustomButton title="Actualizar catálogos" variant="outline" onPress={cargarCatalogos} disabled={formularioBloqueado} />
              </View>
            )}
            {errors.general && (
              <View style={styles.errorCard}>
                <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorText}>{errors.general}</Text>
              </View>
            )}
            {mensajeComprobacion && (
              <View style={styles.demoNotice}>
                <Text accessibilityRole="alert" style={styles.demoText}>{mensajeComprobacion}</Text>
              </View>
            )}

            <ReportSection number="01" title="¿Qué sucede?" description="Clasifica el problema y agrega una descripción.">
              <CustomPicker
                label="Departamento" placeholder="Selecciona un departamento"
                items={departamentosItems} selectedValue={selectedDepartamento}
                onValueChange={handleDepartamentoChange} isLoading={isLoadingCatalogos}
                disabled={formularioBloqueado}
                hasError={Boolean(errors.departamento)} errorMessage={errors.departamento}
              />
              <CustomPicker
                label="Categoría" placeholder="Selecciona una categoría"
                items={categoriasItems} selectedValue={selectedCategoria}
                onValueChange={handleCategoriaChange} isLoading={isLoadingCatalogos}
                disabled={formularioBloqueado}
                hasError={Boolean(errors.categoria)} errorMessage={errors.categoria}
              />
              <CustomInput
                label="Descripción" accessibilityLabel="Descripción del problema"
                placeholder="Por ejemplo: hay una fuga de agua frente al parque."
                value={descripcion} onChangeText={handleDescripcionChange}
                editable={!formularioBloqueado}
                multiline numberOfLines={4} style={styles.textArea}
                hasError={Boolean(errors.descripcion)} errorMessage={errors.descripcion}
              />
              <Text style={styles.supportingText}>{descripcion.length} caracteres · mínimo 10</Text>
            </ReportSection>

            <ReportSection number="02" title="Ubicación del reporte" description="En esta etapa se utilizarán las siguientes coordenadas de ejemplo.">
              <Text style={styles.supportingText}>{referenciaUbicacion}</Text>
              <View style={styles.locationCard}>
                <View style={styles.locationHeading}>
                  <Text style={styles.locationTitle}>Ubicación de ejemplo</Text>
                  <View style={styles.exampleBadge}><Text style={styles.exampleBadgeText}>SIMULADA</Text></View>
                </View>
                <View style={styles.coordinatesRow}>
                  <View style={styles.coordinate}>
                    <Text style={styles.coordinateLabel}>Latitud</Text>
                    <Text style={styles.coordinateValue}>{coordenadas.lat}</Text>
                  </View>
                  <View style={styles.coordinate}>
                    <Text style={styles.coordinateLabel}>Longitud</Text>
                    <Text style={styles.coordinateValue}>{coordenadas.lng}</Text>
                  </View>
                </View>
                <Text style={styles.supportingText}>Esta ubicación es ilustrativa. No se está consultando el GPS del dispositivo.</Text>
              </View>
            </ReportSection>

            <ReportSection number="03" title="Evidencia de ejemplo" description="Opcional. Añade una imagen que corresponda a la categoría seleccionada.">
              {fotoEvidencia ? (
                <View style={styles.photoCard}>
                  <Image
                    key={fotoIntento} source={{ uri: fotoEvidencia.url }} style={styles.imagePreview} resizeMode="cover"
                    onLoad={() => handleFotoCargada(fotoIntento)} onError={() => handleFotoError(fotoIntento)}
                    accessibilityLabel="Fotografía de ejemplo; no fue tomada con la cámara del dispositivo"
                  />
                  <View style={styles.photoCaption}>
                    <Text style={styles.photoLabel}>Fotografía de ejemplo</Text>
                    <Text style={styles.supportingText}>{fotoEvidencia.descripcion}</Text>
                    <Text style={styles.supportingText}>{fotoEvidencia.credito}</Text>
                    <Text style={styles.supportingText}>{estadoFoto === 'loading'
                      ? 'Cargando imagen de ejemplo. Puedes enviar el reporte sin esperar.'
                      : estadoFoto === 'error'
                        ? 'Error al cargar la imagen de ejemplo. Puedes enviar sin foto.'
                        : 'Imagen de ejemplo disponible para adjuntar al reporte.'}</Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button" accessibilityLabel="Quitar fotografía de ejemplo"
                    style={styles.removePhotoButton} onPress={handleEliminarFoto} disabled={formularioBloqueado} activeOpacity={0.7}
                  >
                    <Text style={styles.removePhotoText}>Quitar foto de ejemplo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  accessibilityRole="button" accessibilityLabel="Añadir una fotografía de ejemplo sin abrir la cámara"
                  style={styles.addPhotoButton} onPress={handleAdjuntarFoto} disabled={!puedeAdjuntarFoto} activeOpacity={0.7}
                >
                  <View style={styles.cameraIcon} accessible={false}>
                    <View style={styles.cameraTop} /><View style={styles.cameraLens} />
                  </View>
                  <Text style={styles.addPhotoText}>Añadir foto de ejemplo</Text>
                  <Text style={styles.supportingText}>Selecciona una categoría. Usaremos su imagen de ejemplo sin abrir la cámara.</Text>
                </TouchableOpacity>
              )}
              {errors.foto && <Text accessibilityRole="alert" style={styles.errorText}>{errors.foto}</Text>}
              {estadoFoto === 'error' && (
                <CustomButton title="Reintentar imagen" variant="outline" onPress={handleReintentarFoto} disabled={formularioBloqueado} />
              )}
            </ReportSection>

            <View style={styles.submitCard}>
              <Text style={styles.submitTitle}>Revisa y envía tu reporte</Text>
              <Text style={styles.submitDescription}>Confirmaremos el registro cuando el sistema responda con tu número de reporte.</Text>
              <CustomButton
                title="Enviar reporte" onPress={handleSubmitReporte} isLoading={isSubmitting} disabled={!puedeEnviar}
                accessibilityRole="button" accessibilityLabel="Enviar reporte"
                accessibilityState={{ busy: isSubmitting, disabled: !puedeEnviar }}
              />
              <Text style={styles.submitNote}>La ubicación y la fotografía utilizadas son de ejemplo.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={Boolean(reporteCreado)} transparent animationType="fade" onRequestClose={cerrarModalExito}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeArea}>
            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalCard} accessibilityViewIsModal>
                <View style={styles.modalIcon} accessible={false}><Text style={styles.modalIconText}>✓</Text></View>
                <Text accessibilityRole="header" style={styles.modalTitle}>Reporte registrado</Text>
                <Text style={styles.modalDescription}>Tu reporte quedó guardado con estado Recibido. Conserva su número para consultarlo.</Text>
                <View style={styles.folioBox}>
                  <Text style={styles.folioLabel}>NÚMERO DE REPORTE</Text>
                  <Text selectable style={styles.folioNumber}>#{reporteCreado?.idIncidencia}</Text>
                </View>
                <CustomButton
                  title="Volver al formulario" onPress={cerrarModalExito}
                  accessibilityRole="button" style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerContent: { width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.md },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minWidth: 160 },
  brandMark: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: COLORS.accent },
  brandMarkText: { fontSize: 13, fontWeight: '800', color: COLORS.textInverse },
  brandName: { fontSize: 17, fontWeight: '700', color: COLORS.primary },
  brandCaption: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  headingContent: { flex: 1, minWidth: 0 },
  logoutButton: { minHeight: 48, minWidth: 64, paddingHorizontal: SPACING.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md },
  logoutText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: SPACING.md },
  profileRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  userName: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: COLORS.textSecondary, flexShrink: 1 },
  hero: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.lg, overflow: 'hidden' },
  heroAccent: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.accent, marginBottom: SPACING.md },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: COLORS.textInverse },
  heroTitle: { fontSize: 29, lineHeight: 37, fontWeight: '700', color: COLORS.textInverse, marginTop: SPACING.sm },
  heroDescription: { fontSize: 15, lineHeight: 23, color: COLORS.textInverse, marginTop: SPACING.sm },
  demoNotice: { padding: SPACING.md, gap: SPACING.xs, backgroundColor: COLORS.accentLight, borderLeftWidth: 4, borderLeftColor: COLORS.accent, borderRadius: RADIUS.md },
  demoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  demoText: { fontSize: 14, lineHeight: 21, color: COLORS.textPrimary },
  section: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.lg },
  sectionNumber: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  sectionNumberText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: COLORS.textPrimary },
  sectionDescription: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary, marginTop: SPACING.xs },
  textArea: { minHeight: 120, height: 120, textAlignVertical: 'top', paddingTop: SPACING.sm },
  errorCard: { backgroundColor: COLORS.errorBackground, borderWidth: 1, borderColor: COLORS.errorBorder, padding: SPACING.md, borderRadius: RADIUS.md, gap: SPACING.sm },
  errorText: { fontSize: 14, lineHeight: 21, color: COLORS.errorText },
  locationCard: { backgroundColor: COLORS.primaryMuted, padding: SPACING.md, borderRadius: RADIUS.md, gap: SPACING.md },
  locationHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  locationTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  exampleBadge: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, backgroundColor: COLORS.surface, borderRadius: RADIUS.full },
  exampleBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7, color: COLORS.primary },
  coordinatesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  coordinate: { flexGrow: 1, flexBasis: 100, gap: SPACING.xs },
  coordinateLabel: { fontSize: 13, color: COLORS.textSecondary },
  coordinateValue: { fontSize: 17, fontWeight: '600', color: COLORS.primary },
  supportingText: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  addPhotoButton: { alignItems: 'center', padding: SPACING.lg, gap: SPACING.sm, minHeight: 160, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primaryLight, borderRadius: RADIUS.md, backgroundColor: COLORS.background },
  cameraIcon: { width: 38, height: 29, marginTop: SPACING.xs, marginBottom: SPACING.sm, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  cameraTop: { position: 'absolute', width: 17, height: 5, top: -6, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: COLORS.primary },
  cameraLens: { width: 13, height: 13, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 7 },
  addPhotoText: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: COLORS.primary, textAlign: 'center' },
  photoCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, overflow: 'hidden' },
  imagePreview: { width: '100%', aspectRatio: 1.6, backgroundColor: COLORS.background },
  photoCaption: { padding: SPACING.md, gap: SPACING.xs },
  photoLabel: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: COLORS.textPrimary },
  removePhotoButton: { minHeight: 48, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: COLORS.border },
  removePhotoText: { fontSize: 14, lineHeight: 21, color: COLORS.errorText, fontWeight: '600', textAlign: 'center' },
  submitCard: { padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, gap: SPACING.sm },
  submitTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: COLORS.textPrimary },
  submitDescription: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  submitNote: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10, 31, 48, 0.58)' },
  modalSafeArea: { flex: 1 },
  modalScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalCard: { width: '100%', maxWidth: 440, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, padding: SPACING.lg, alignItems: 'center' },
  modalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primaryMuted, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  modalIconText: { fontSize: 27, fontWeight: '700', color: COLORS.primary },
  modalTitle: { fontSize: 23, lineHeight: 30, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  modalDescription: { fontSize: 15, lineHeight: 23, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },
  folioBox: { width: '100%', padding: SPACING.md, backgroundColor: COLORS.primaryMuted, borderRadius: RADIUS.md, alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.lg },
  folioLabel: { fontSize: 11, letterSpacing: 0.8, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  folioNumber: { fontSize: 22, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  modalButton: { alignSelf: 'stretch', marginTop: SPACING.lg },
});
