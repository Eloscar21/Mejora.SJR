import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  mensaje: string | null;
  verificando: boolean;
  onReintentar: () => void;
  onCerrar: () => void;
}

export function EstadoSesionView({ mensaje, verificando, onReintentar, onCerrar }: Props) {
  return <View style={styles.pantalla}>
    {verificando ? <>
      <ActivityIndicator size="large" color="#1D5943" />
      <Text style={styles.texto}>Comprobando tu sesión…</Text>
    </> : <>
      <Text style={styles.texto} accessibilityRole="alert">{mensaje}</Text>
      <Pressable accessibilityRole="button" style={styles.boton} onPress={onReintentar}><Text style={styles.etiqueta}>Reintentar</Text></Pressable>
      <Pressable accessibilityRole="button" style={styles.boton} onPress={onCerrar}><Text style={styles.etiqueta}>Cerrar sesión</Text></Pressable>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F4F7F5' },
  texto: { fontSize: 17, textAlign: 'center', color: '#16382D', marginVertical: 16 },
  boton: { padding: 16, minHeight: 52, backgroundColor: '#1D5943', borderRadius: 10, marginTop: 12 },
  etiqueta: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
