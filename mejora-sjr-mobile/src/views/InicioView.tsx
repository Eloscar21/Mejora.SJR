import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface InicioViewProps {
  cerrandoSesion: boolean;
  errorCierre: string | null;
  onCerrarSesion: () => void;
}

export function InicioView({ cerrandoSesion, errorCierre, onCerrarSesion }: InicioViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mejora SJR</Text>
      <Text style={styles.description}>Bienvenido a tu espacio ciudadano.</Text>
      {errorCierre && <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">{errorCierre}</Text>}
      <Pressable
        onPress={onCerrarSesion}
        disabled={cerrandoSesion}
        accessibilityRole="button"
        accessibilityState={{ disabled: cerrandoSesion, busy: cerrandoSesion }}
        style={({ pressed }) => [styles.boton, (pressed || cerrandoSesion) && styles.atenuado]}
      >
        {cerrandoSesion && <ActivityIndicator color="#FFFFFF" />}
        <Text style={styles.textoBoton}>{cerrandoSesion ? 'Cerrando sesión…' : 'Cerrar sesión'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { color: '#A32727', marginTop: 20, textAlign: 'center' },
  boton: { backgroundColor: '#1D5943', borderRadius: 10, padding: 16, minHeight: 52, marginTop: 28, flexDirection: 'row', gap: 10, alignItems: 'center' },
  atenuado: { opacity: 0.7 },
  textoBoton: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#16382D',
  },
  description: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    color: '#454545',
  },
});
