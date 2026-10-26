/**
 * App.tsx
 * Punto de entrada principal para la aplicación móvil Mejora SJR.
 * 
 * Principios aplicados:
 * - DIP / IoC: Envuelve la aplicación en el contenedor AuthProvider.
 */

import React from 'react';
import { AuthProvider } from './src/providers/AuthProvider';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider useMock={true}>
      <AppNavigator />
    </AuthProvider>
  );
}
