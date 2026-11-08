/**
 * app/acceso-denegado/page.tsx
 * Vista Institucional 403 Forbidden a pantalla completa (US-015).
 * Destino de expulsión del Route Guard para perfiles sin privilegios administrativos.
 */

import React from 'react';
import { IntercepcionErrorView } from '@/views/errors/IntercepcionErrorView';

export default function AccesoDenegadoGlobalPage() {
  return <IntercepcionErrorView codigo={403} modo="pantalla-completa" />;
}

