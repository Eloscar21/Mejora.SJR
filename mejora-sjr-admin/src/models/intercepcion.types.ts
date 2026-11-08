/**
 * intercepcion.types.ts
 * Modelos y descriptores tipados para las Vistas Institucionales de Intercepción HTTP (US-015).
 *
 * Cubre los escenarios:
 * - 401 Unauthorized (Sesión inexistente, expirada o token inválido)
 * - 403 Forbidden (Expulsión por Route Guard RBAC: falta de privilegios para el recurso)
 * - 404 Not Found (Ruta o módulo inexistente dentro del portal municipal)
 */

export type CodigoIntercepcionHttp = 401 | 403 | 404;

export type MotivoIntercepcion =
  | 'sesion_requerida'
  | 'sesion_expirada'
  | 'token_invalido'
  | 'rol_restringido'
  | 'privilegios_superadmin'
  | 'recurso_no_encontrado';

export interface DescriptorIntercepcion {
  codigo: CodigoIntercepcionHttp;
  etiquetaHttp: '401 Unauthorized' | '403 Forbidden' | '404 Not Found';
  insigniaSeguridad: string;
  titulo: string;
  mensajePrincipal: string;
  detalleInstitucional: string;
  rutaSolicitada: string | null;
  rolDetectadoTexto: string | null;
}

