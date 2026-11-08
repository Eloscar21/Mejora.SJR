/**
 * app/not-found.tsx
 * Manejador global 404 Not Found de Next.js App Router con diseño corporativo (#0A3D62) (US-015).
 */

import React from 'react';
import { IntercepcionErrorView } from '@/views/errors/IntercepcionErrorView';

export default function GlobalNotFoundPage() {
  return <IntercepcionErrorView codigo={404} modo="pantalla-completa" />;
}

