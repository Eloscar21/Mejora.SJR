/**
 * app/403/page.tsx
 * Ruta canónica directa para inspección de la vista corporativa 403 Forbidden (US-015).
 */

import React from 'react';
import { IntercepcionErrorView } from '@/views/errors/IntercepcionErrorView';

export default function Http403Page() {
  return <IntercepcionErrorView codigo={403} modo="pantalla-completa" />;
}

