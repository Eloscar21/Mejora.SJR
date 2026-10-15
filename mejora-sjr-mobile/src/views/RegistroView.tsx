/**
 * Vista visual del formulario de registro de ciudadanos (US-003).
 *
 * Mapeo SOLID:
 * - (S - Single Responsibility): Su ÚNICO propósito es renderizar componentes visuales
 *   y reflejar el estado del ViewModel.
 * - CERO lógica de negocio: no valida expresiones regulares, no compara contraseñas
 *   ni realiza peticiones HTTP directas.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRegistroViewModel, UseRegistroViewModelProps } from '../viewModels/useRegistroViewModel';

export interface RegistroViewProps extends UseRegistroViewModelProps {
  onRegistroExitoso?: () => void;
  onIrALogin?: () => void;
}

export const RegistroView: React.FC<RegistroViewProps> = ({
  authService,
  onRegistroExitoso,
  onIrALogin
}) => {
  // Inyección del ViewModel desacoplado
  const {
    formulario,
    errores,
    isLoading,
    isSuccess,
    mensajeExito,
    cambiarCampo,
    registrar
  } = useRegistroViewModel({ authService });

  // Si el registro fue exitoso según el ViewModel, mostramos mensaje de confirmación
  if (isSuccess) {
    return (
      <View style={styles.pantallaCentrada}>
        <View style={styles.tarjetaExito}>
          <Text style={styles.iconoExito}>✓</Text>
          <Text style={styles.tituloExito}>¡Cuenta Creada!</Text>
          <Text style={styles.mensajeExitoTexto}>{mensajeExito}</Text>
          <TouchableOpacity
            style={styles.botonPrimario}
            onPress={onRegistroExitoso || onIrALogin}
          >
            <Text style={styles.textoBotonPrimario}>Ir a Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.contenedorPrincipal}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.encabezado}>
          <Text style={styles.subtituloMunicipio}>Municipio de San Juan del Río</Text>
          <Text style={styles.titulo}>Registro Ciudadano</Text>
          <Text style={styles.descripcion}>
            Crea tu cuenta para reportar incidencias y dar seguimiento a mejoras en tu colonia.
          </Text>
        </View>

        {/* Mensaje de Error General del Servidor / Red */}
        {errores.general && (
          <View style={styles.cajaErrorGeneral}>
            <Text style={styles.textoErrorGeneral}>{errores.general}</Text>
          </View>
        )}

        {/* Campo: Nombre Completo */}
        <View style={styles.campoGrupo}>
          <Text style={styles.etiqueta}>Nombre Completo</Text>
          <TextInput
            style={[styles.input, errores.nombre ? styles.inputConError : null]}
            placeholder="Ej. Juan Pérez García"
            placeholderTextColor="#8C9BAE"
            value={formulario.nombre}
            onChangeText={(texto) => cambiarCampo('nombre', texto)}
            autoCapitalize="words"
            editable={!isLoading}
          />
          {errores.nombre && <Text style={styles.textoError}>{errores.nombre}</Text>}
        </View>

        {/* Campo: Correo Electrónico */}
        <View style={styles.campoGrupo}>
          <Text style={styles.etiqueta}>Correo Electrónico</Text>
          <TextInput
            style={[styles.input, errores.email ? styles.inputConError : null]}
            placeholder="ejemplo@correo.com"
            placeholderTextColor="#8C9BAE"
            value={formulario.email}
            onChangeText={(texto) => cambiarCampo('email', texto)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
          {errores.email && <Text style={styles.textoError}>{errores.email}</Text>}
        </View>

        {/* Campo: Contraseña */}
        <View style={styles.campoGrupo}>
          <Text style={styles.etiqueta}>Contraseña</Text>
          <TextInput
            style={[styles.input, errores.password ? styles.inputConError : null]}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor="#8C9BAE"
            value={formulario.password}
            onChangeText={(texto) => cambiarCampo('password', texto)}
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
          />
          {errores.password && <Text style={styles.textoError}>{errores.password}</Text>}
        </View>

        {/* Campo: Confirmar Contraseña */}
        <View style={styles.campoGrupo}>
          <Text style={styles.etiqueta}>Confirmar Contraseña</Text>
          <TextInput
            style={[styles.input, errores.confirmarPassword ? styles.inputConError : null]}
            placeholder="Vuelve a escribir tu contraseña"
            placeholderTextColor="#8C9BAE"
            value={formulario.confirmarPassword}
            onChangeText={(texto) => cambiarCampo('confirmarPassword', texto)}
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
          />
          {errores.confirmarPassword && (
            <Text style={styles.textoError}>{errores.confirmarPassword}</Text>
          )}
        </View>

        {/* Botón de Enviar */}
        <TouchableOpacity
          style={[styles.botonPrimario, isLoading ? styles.botonDeshabilitado : null]}
          onPress={registrar}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.textoBotonPrimario}>Crear Cuenta</Text>
          )}
        </TouchableOpacity>

        {/* Enlace para ir al Login si ya tiene cuenta */}
        {onIrALogin && (
          <TouchableOpacity
            style={styles.botonSecundario}
            onPress={onIrALogin}
            disabled={isLoading}
          >
            <Text style={styles.textoBotonSecundario}>
              ¿Ya tienes cuenta? <Text style={styles.enlaceTexto}>Inicia Sesión</Text>
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  scrollContenido: {
    paddingHorizontal: 24,
    paddingVertical: 32
  },
  pantallaCentrada: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  tarjetaExito: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    width: '100%',
    maxWidth: 400
  },
  iconoExito: {
    fontSize: 48,
    color: '#16A34A',
    fontWeight: '700',
    marginBottom: 16
  },
  tituloExito: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8
  },
  mensajeExitoTexto: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  encabezado: {
    marginBottom: 28
  },
  subtituloMunicipio: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8
  },
  descripcion: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20
  },
  campoGrupo: {
    marginBottom: 18
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A'
  },
  inputConError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  textoError: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500'
  },
  cajaErrorGeneral: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 18
  },
  textoErrorGeneral: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center'
  },
  botonPrimario: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3
  },
  botonDeshabilitado: {
    backgroundColor: '#94A3B8',
    elevation: 0
  },
  textoBotonPrimario: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  botonSecundario: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8
  },
  textoBotonSecundario: {
    fontSize: 14,
    color: '#64748B'
  },
  enlaceTexto: {
    color: '#0284C7',
    fontWeight: '700'
  }
});
