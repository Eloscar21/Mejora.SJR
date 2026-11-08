/**
 * app/admin/acceso-denegado/page.tsx
 * Vista Institucional 403 Forbidden dentro del entorno administrativo (US-013 / US-015).
 * Diseño corporativo (#0A3D62) cuando el Route Guard bloquea el acceso de Rol 3 a /admin/personal.
 */

import React from 'react';
import { IntercepcionErrorView } from '@/views/errors/IntercepcionErrorView';

export default function AdminAccesoDenegadoPage() {
  return <IntercepcionErrorView codigo={403} modo="embebido" />;
}
