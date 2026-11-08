/**
 * app/no-autorizado/page.tsx
 * Vista Institucional 401 Unauthorized (US-015).
 */

import React from 'react';
import { IntercepcionErrorView } from '@/views/errors/IntercepcionErrorView';

export default function NoAutorizadoPage() {
  return <IntercepcionErrorView codigo={401} modo="pantalla-completa" />;
}

