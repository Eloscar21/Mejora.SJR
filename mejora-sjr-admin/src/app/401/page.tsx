/**
 * app/401/page.tsx
 * Ruta canónica directa para inspección de la vista corporativa 401 Unauthorized (US-015).
 */

import React from 'react';
import { IntercepcionErrorView } from '@/views/errors/IntercepcionErrorView';

export default function Http401Page() {
  return <IntercepcionErrorView codigo={401} modo="pantalla-completa" />;
}

