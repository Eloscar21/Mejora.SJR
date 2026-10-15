import { StyleSheet, Text, View } from 'react-native';

export function InicioView() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mejora SJR</Text>
      <Text style={styles.description}>Base móvil lista para comenzar.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
