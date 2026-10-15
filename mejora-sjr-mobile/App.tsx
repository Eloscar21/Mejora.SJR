import { StatusBar } from 'expo-status-bar';
import { LoginView } from './src/views/LoginView';
import { useLoginViewModel } from './src/viewModels/useLoginViewModel';
import { MockLoginService } from './src/services/mocks/MockLoginService';
import { LoginApiService } from './src/services/api/LoginApiService';
import * as SecureStore from 'expo-secure-store';
import { SecureTokenStorage } from './src/services/storage/SecureTokenStorage';
import { InicioSesionService } from './src/services/InicioSesionService';
import { InicioView } from './src/views/InicioView';
import { useSesionViewModel } from './src/viewModels/useSesionViewModel';
import { RenovacionApiService } from './src/services/api/RenovacionApiService';
import { SecureSalidaStorage } from './src/services/storage/SecureSalidaStorage';
import { TiempoFueraService } from './src/services/TiempoFueraService';
import { ControlSesion } from './src/services/ControlSesion';
import { EstadoSesionView } from './src/views/EstadoSesionView';

// La URL del backend es pública; nunca incluir credenciales de BD ni JWT_SECRET.
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const modoPrueba = !apiUrl;
const loginService = apiUrl ? new LoginApiService(apiUrl) : new MockLoginService();
const tokenStorage = new SecureTokenStorage(SecureStore);
const inicioSesionService = new InicioSesionService(loginService, tokenStorage);
const salidaStorage = new SecureSalidaStorage(SecureStore);
const renovacionService = apiUrl ? new RenovacionApiService(apiUrl) : {
  async renovar(): Promise<string> { throw new Error('La API no está configurada.'); },
};
const controlSesion = new ControlSesion(inicioSesionService, renovacionService,
  tokenStorage, salidaStorage, new TiempoFueraService(salidaStorage));

export default function App() {
  const login = useLoginViewModel(controlSesion);
  const sesion = useSesionViewModel(controlSesion);
  return (
    <>
      {sesion.fase === 'verificando' || sesion.fase === 'error' ? <EstadoSesionView
        verificando={sesion.fase === 'verificando'}
        mensaje={sesion.mensaje}
        onReintentar={() => { void sesion.reintentar(); }}
        onCerrar={() => { void sesion.cerrarSesion(); }}
      /> : sesion.fase === 'activa' ? <InicioView
        cerrandoSesion={false}
        errorCierre={null}
        onCerrarSesion={() => { void sesion.cerrarSesion(); }}
      /> : <LoginView
        formulario={login.formulario}
        errores={{ ...login.errores, general: login.errores.general ?? sesion.mensaje ?? undefined }}
        isLoading={login.isLoading}
        cambiarCampo={login.cambiarCampo}
        onIniciarSesion={() => { void login.iniciarSesion(); }}
        modoPrueba={modoPrueba}
      />}
      <StatusBar style="dark" />
    </>
  );
}

