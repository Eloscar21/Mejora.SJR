/**
 * CrearReporteView.tsx
 * Pantalla de "Crear Reporte / Nuevo Reporte" para Ciudadanos (Rol 1) con Pickers de Catálogos (US-004).
 * 
 * Reglas de US-004:
 * - Renderiza el menú desplegable (Picker) consumiendo los catálogos oficiales de US-002 (Departamentos y Categorías).
 * - Selección de Departamento padre y Categoría dependiente con resolución de llave foránea.
 * - Validación visual en rojo si se omite algún campo requerido.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Image,
} from 'react-native';
import { useReporteViewModel } from '../viewModels/useReporteViewModel';
import { CustomPicker } from '../components/CustomPicker';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { RoleBadge } from '../components/RoleBadge';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export const CrearReporteView: React.FC = () => {
  const {
    session,
    departamentosItems,
    categoriasItems,
    isLoadingCatalogos,
    errorCatalogos,
    selectedDepartamento,
    selectedCategoria,
    descripcion,
    direccionReferencia,
    coordenadas,
    fotoEvidenciaUri,
    errors,
    isSubmitting,
    folioCreado,
    handleDepartamentoChange,
    handleCategoriaChange,
    handleDescripcionChange,
    handleDireccionChange,
    handleAdjuntarFoto,
    handleEliminarFoto,
    handleSubmitReporte,
    cerrarModalExito,
    cerrarSesion,
  } = useReporteViewModel();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Barra Superior de Usuario */}
      <View style={styles.topBar}>
        <View style={styles.userProfile}>
          <Text style={styles.userName}>{session?.nombre || 'Ciudadano'}</Text>
          <RoleBadge idRol={session?.idRol || 1} idDepartamento={session?.idDepartamento} />
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
        {/* Banner Informativo */}
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerTitle}>Levantamiento de Reporte</Text>
          <Text style={styles.bannerSubtitle}>
            Reporta anomalías en vía pública, agua o alumbrado en San Juan del Río.
          </Text>
        </View>

        {errorCatalogos && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>⚠️ {errorCatalogos}</Text>
          </View>
        )}

        {/* Tarjeta del Formulario */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>1. Clasificación Municipal (US-004)</Text>

          {/* Menú Desplegable (Picker) de Departamento */}
          <CustomPicker
            label="Dependencia / Departamento Responsable"
            placeholder="-- Selecciona un Departamento --"
            items={departamentosItems}
            selectedValue={selectedDepartamento}
            onValueChange={handleDepartamentoChange}
            isLoading={isLoadingCatalogos}
            hasError={Boolean(errors.departamento)}
            errorMessage={errors.departamento}
          />

          {/* Menú Desplegable (Picker) de Categoría */}
          <CustomPicker
            label="Categoría de la Incidencia"
            placeholder={
              selectedDepartamento
                ? '-- Selecciona una Categoría --'
                : '-- Selecciona primero un Departamento --'
            }
            items={categoriasItems}
            selectedValue={selectedCategoria}
            onValueChange={handleCategoriaChange}
            isLoading={isLoadingCatalogos}
            hasError={Boolean(errors.categoria)}
            errorMessage={errors.categoria}
          />

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>2. Detalle y Evidencia</Text>

          {/* Descripción de la Incidencia */}
          <CustomInput
            label="Descripción de la Problemática"
            placeholder="Describe qué ocurre, gravedad y puntos de referencia cercanos..."
            value={descripcion}
            onChangeText={handleDescripcionChange}
            multiline
            numberOfLines={4}
            style={styles.textArea}
            hasError={Boolean(errors.descripcion)}
            errorMessage={errors.descripcion}
            helperText={`${descripcion.length} caracteres (mínimo 10)`}
          />

          {/* Dirección de Referencia */}
          <CustomInput
            label="Ubicación / Dirección en San Juan del Río"
            placeholder="Calle, número, colonia o cruces emblemáticos..."
            value={direccionReferencia}
            onChangeText={handleDireccionChange}
            hasError={Boolean(errors.direccion)}
            errorMessage={errors.direccion}
          />

          {/* Coordenadas Geográficas Simuladas (GPS SJR) */}
          <View style={styles.gpsCard}>
            <View style={styles.gpsRow}>
              <Text style={styles.gpsIcon}>📍</Text>
              <View>
                <Text style={styles.gpsTitle}>Geolocalización GPS (SJR)</Text>
                <Text style={styles.gpsCoords}>
                  Lat: {coordenadas.lat}° N • Lng: {coordenadas.lng}° W
                </Text>
              </View>
            </View>
            <View style={styles.gpsBadge}>
              <Text style={styles.gpsBadgeText}>Precisión Alta</Text>
            </View>
          </View>

          {/* Evidencia Fotográfica */}
          <Text style={styles.evidenceLabel}>Evidencia Fotográfica (Opcional)</Text>
          {fotoEvidenciaUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: fotoEvidenciaUri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={handleEliminarFoto}
              >
                <Text style={styles.removePhotoText}>✕ Eliminar Foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAdjuntarFoto}
              activeOpacity={0.7}
            >
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={styles.addPhotoText}>Tomar Fotografía / Subir Evidencia</Text>
            </TouchableOpacity>
          )}

          {/* Botón de Envío */}
          <CustomButton
            title="Registrar Incidencia Municipal"
            onPress={handleSubmitReporte}
            isLoading={isSubmitting}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>

      {/* Modal de Éxito con Folio */}
      <Modal
        visible={Boolean(folioCreado)}
        transparent={true}
        animationType="slide"
        onRequestClose={cerrarModalExito}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSuccessCard}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successCheck}>✓</Text>
            </View>
            <Text style={styles.successTitle}>¡Reporte Registrado!</Text>
            <Text style={styles.successText}>
              Tu incidencia ha sido turnada al departamento correspondiente para su pronta atención.
            </Text>

            <View style={styles.folioBox}>
              <Text style={styles.folioLabel}>NÚMERO DE FOLIO OFICIAL</Text>
              <Text style={styles.folioNumber}>{folioCreado}</Text>
            </View>

            <CustomButton
              title="Aceptar y Continuar"
              onPress={cerrarModalExito}
              style={{ width: '100%', marginTop: SPACING.md }}
            />
          </View>
        </View>
      </Modal>
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
  errorBox: {
    backgroundColor: COLORS.errorBackground,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorBoxText: {
    fontSize: 12,
    color: COLORS.errorText,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.md,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  gpsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  gpsCoords: {
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
  },
  gpsBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  gpsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  evidenceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    backgroundColor: '#F8FAFC',
    marginBottom: SPACING.lg,
  },
  addPhotoIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  addPhotoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.md,
  },
  removePhotoButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 61, 98, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalSuccessCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  successCheck: {
    fontSize: 30,
    color: '#16A34A',
    fontWeight: '800',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  successText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  folioBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#0284C7',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    width: '100%',
  },
  folioLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
    letterSpacing: 1,
  },
  folioNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0A3D62',
    marginTop: 2,
    letterSpacing: 1,
  },
});
