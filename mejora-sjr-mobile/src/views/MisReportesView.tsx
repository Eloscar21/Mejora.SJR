import React from 'react';
import { View, Text, Modal, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { useReportesCiudadanoViewModel } from '../viewModels/useReportesCiudadanoViewModel';
import { CustomButton } from '../components/CustomButton';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

interface Props { viewModel: ReturnType<typeof useReportesCiudadanoViewModel>['lista'] }

/** Lista privada de solo consulta; la decisión de coincidencia viene del ViewModel. */
export function MisReportesView({ viewModel: vm }: Props) {
  return (
    <Modal visible={vm.visible} animationType="slide" onRequestClose={vm.cerrar}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>Mis reportes</Text>
          <CustomButton title="Volver" variant="outline" onPress={vm.cerrar} />
        </View>
        <View style={styles.actions}>
          <Text style={styles.note}>Consulta tus reportes y su estado actual.</Text>
          <CustomButton title="Actualizar" variant="outline" onPress={vm.recargar} isLoading={vm.isLoading} />
        </View>
        {vm.requiereComprobacion && (
          <View style={styles.notice}>
            <Text style={styles.note}>Comprueba si el reporte ya está registrado. Confirma una coincidencia solo si corresponde a tu borrador; no se volverá a enviar.</Text>
          </View>
        )}
        {vm.error && <View style={styles.notice}><Text accessibilityRole="alert" style={styles.error}>{vm.error}</Text></View>}
        {vm.isLoading ? <ActivityIndicator style={styles.loading} size="large" color={COLORS.primary} /> : (
          <FlatList
            data={vm.filas}
            keyExtractor={fila => String(fila.reporte.idIncidencia)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={!vm.error ? (
              <Text style={styles.note}>{vm.requiereComprobacion
                ? 'Todavía no encontramos una coincidencia. Actualiza más tarde; la ausencia no confirma que el envío haya fallado.'
                : 'Aún no tienes reportes registrados.'}</Text>
            ) : undefined}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.number}>Reporte #{item.reporte.idIncidencia}</Text>
                <Text style={styles.category}>{item.categoriaNombre}</Text>
                <Text style={styles.description}>{item.reporte.descripcion}</Text>
                <Text style={styles.state}>{item.estadoNombre}</Text>
                <Text style={styles.note}>{item.fechaTexto}</Text>
                {item.puedeConfirmar && <CustomButton title="Este reporte ya está guardado" onPress={() => vm.confirmarExistente(item.reporte.idIncidencia)} />}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, gap: SPACING.sm, backgroundColor: COLORS.surface },
  title: { fontSize: 25, fontWeight: '700', color: COLORS.primary },
  actions: { padding: SPACING.md, gap: SPACING.sm },
  list: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xl },
  card: { backgroundColor: COLORS.surface, padding: SPACING.md, gap: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  number: { color: COLORS.primary, fontSize: 17, fontWeight: '700' },
  category: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
  description: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 23 },
  state: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  note: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21 },
  notice: { padding: SPACING.md, backgroundColor: COLORS.accentLight, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: RADIUS.md },
  error: { color: COLORS.errorText, fontSize: 14, lineHeight: 21 },
  loading: { marginTop: SPACING.xl },
});
