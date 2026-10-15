import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import type { CredencialesLogin, ErroresLogin } from '../models/Login';

interface LoginViewProps {
  formulario: CredencialesLogin;
  errores: ErroresLogin;
  isLoading: boolean;
  modoPrueba?: boolean;
  cambiarCampo: (campo: keyof CredencialesLogin, valor: string) => void;
  onIniciarSesion: () => void;
}

export function LoginView({
  formulario, errores, isLoading, modoPrueba = false, cambiarCampo, onIniciarSesion,
}: LoginViewProps) {
  return (
    <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <View style={styles.formulario}>
          <Text style={styles.municipio}>SAN JUAN DEL RÍO</Text>
          <Text style={styles.marca}>Mejora SJR</Text>
          <Text style={styles.titulo} accessibilityRole="header">Inicia sesión</Text>
          <Text style={styles.descripcion}>Accede para reportar y dar seguimiento a las mejoras de tu comunidad.</Text>
          {modoPrueba && <Text style={styles.aviso}>Modo de prueba · No se iniciará una sesión real.</Text>}

          <Text style={styles.etiqueta}>Correo electrónico</Text>
          <TextInput
            style={[styles.input, errores.email ? styles.inputError : undefined]}
            accessibilityLabel="Correo electrónico"
            accessibilityHint={errores.email}
            value={formulario.email}
            onChangeText={(valor) => cambiarCampo('email', valor)}
            placeholder="nombre@ejemplo.com"
            placeholderTextColor="#64736D"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!isLoading}
          />
          {errores.email && <Text style={styles.error} accessibilityLiveRegion="polite">{errores.email}</Text>}

          <Text style={styles.etiqueta}>Contraseña</Text>
          <TextInput
            style={[styles.input, errores.password ? styles.inputError : undefined]}
            accessibilityLabel="Contraseña"
            accessibilityHint={errores.password}
            value={formulario.password}
            onChangeText={(valor) => cambiarCampo('password', valor)}
            placeholder="Escribe tu contraseña"
            placeholderTextColor="#64736D"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            editable={!isLoading}
            returnKeyType="go"
            onSubmitEditing={onIniciarSesion}
          />
          {errores.password && <Text style={styles.error} accessibilityLiveRegion="polite">{errores.password}</Text>}
          {errores.general && <Text style={styles.errorGeneral} accessibilityRole="alert" accessibilityLiveRegion="polite">{errores.general}</Text>}

          <Pressable
            onPress={onIniciarSesion}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={isLoading ? 'Iniciando sesión' : 'Iniciar sesión'}
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
            style={({ pressed }) => [styles.boton, (pressed || isLoading) && styles.botonAtenuado]}
          >
            {isLoading && <ActivityIndicator color="#FFFFFF" />}
            <Text style={styles.textoBoton}>{isLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#F4F7F5' },
  contenido: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 64 },
  formulario: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  municipio: { fontSize: 12, letterSpacing: 2, color: '#496157', fontWeight: '600' },
  marca: { fontSize: 36, color: '#16382D', fontWeight: '700', marginTop: 8 },
  titulo: { fontSize: 24, color: '#16382D', fontWeight: '600', marginTop: 32 },
  descripcion: { fontSize: 16, lineHeight: 24, color: '#496157', marginTop: 8, marginBottom: 12 },
  aviso: { color: '#654B13', backgroundColor: '#FFF0C7', padding: 12, borderRadius: 8, marginVertical: 8 },
  etiqueta: { fontSize: 15, fontWeight: '600', color: '#16382D', marginTop: 20, marginBottom: 8 },
  input: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#879B91', borderRadius: 10, backgroundColor: '#FFFFFF', color: '#16382D', fontSize: 16 },
  inputError: { borderColor: '#A32727' },
  error: { color: '#A32727', fontSize: 14, marginTop: 6 },
  errorGeneral: { color: '#A32727', backgroundColor: '#FCECEC', padding: 12, borderRadius: 8, marginTop: 20 },
  boton: { minHeight: 54, backgroundColor: '#1D5943', borderRadius: 10, marginTop: 28, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  botonAtenuado: { opacity: 0.7 },
  textoBoton: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
