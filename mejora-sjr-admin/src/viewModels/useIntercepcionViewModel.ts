/**
 * useIntercepcionViewModel.ts
 * ViewModel para las Vistas Institucionales de Intercepción HTTP 401 / 403 / 404 (US-015).
 *
 * Principios aplicados:
 * - MVVM: Resuelve los mensajes institucionales, auditoría de ruta y acciones de navegación segura.
 * - Zero Trust: Limpia restos de sesión local cuando el usuario fue expulsado por falta de autenticación
 *   o por intentar ingresar con un perfil móvil (Ciudadano / Trabajador).
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IAuthService } from '../services/contracts/IAuthService';
import { AuthApiService } from '../services/api/AuthApiService';
import { ROLES_SJR } from '../models/auth.types';
import {
  CodigoIntercepcionHttp,
  DescriptorIntercepcion,
} from '../models/intercepcion.types';

const defaultAuthService: IAuthService = new AuthApiService();

export function useIntercepcionViewModel(
  codigo: CodigoIntercepcionHttp,
  authService: IAuthService = defaultAuthService
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tieneSesionAdminValida, setTieneSesionAdminValida] = useState(false);
  const [rolSesionActual, setRolSesionActual] = useState<number | null>(null);

  const motivoParam = searchParams.get('motivo');
  const origenParam = searchParams.get('origen');
  const rolParam = searchParams.get('rol');

  useEffect(() => {
    const decoded = authService.decodificarToken();
    const now = Math.floor(Date.now() / 1000);
    const vigente = Boolean(decoded && (!decoded.exp || decoded.exp > now));

    if (vigente && decoded && (decoded.idRol === 3 || decoded.idRol === 4)) {
      setTieneSesionAdminValida(true);
      setRolSesionActual(decoded.idRol);
    } else {
      setTieneSesionAdminValida(false);
      setRolSesionActual(null);
      if (codigo === 401 || motivoParam === 'rol_restringido') {
        authService.logout();
      }
    }
  }, [authService, codigo, motivoParam]);

  const rolDetectadoNumero = useMemo<number | null>(() => {
    if (rolParam) {
      const parsed = Number(rolParam);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return rolSesionActual;
  }, [rolParam, rolSesionActual]);

  const rolDetectadoTexto = useMemo<string | null>(() => {
    if (!rolDetectadoNumero) return null;
    const nombre = ROLES_SJR[rolDetectadoNumero as keyof typeof ROLES_SJR];
    return nombre ? `${nombre} (IdRol: ${rolDetectadoNumero})` : `Rol ${rolDetectadoNumero}`;
  }, [rolDetectadoNumero]);

  const descriptor = useMemo<DescriptorIntercepcion>(() => {
    if (codigo === 401) {
      const esExpirada = motivoParam === 'sesion_expirada';
      return {
        codigo: 401,
        etiquetaHttp: '401 Unauthorized',
        insigniaSeguridad: 'Autenticación Institucional Requerida',
        titulo: esExpirada ? 'Tu sesión institucional ha expirado' : 'Acceso No Autenticado',
        mensajePrincipal: esExpirada
          ? 'Por seguridad de la información municipal, tu credencial temporal concluyó su vigencia.'
          : 'Para consultar este módulo administrativo es indispensable iniciar sesión con una cuenta oficial verificada.',
        detalleInstitucional:
          'El guardia de rutas verificó tu solicitud y no encontró una sesión activa válida. Ingresa nuevamente con tus credenciales del H. Ayuntamiento de San Juan del Río.',
        rutaSolicitada: origenParam || null,
        rolDetectadoTexto: null,
      };
    }

    if (codigo === 403) {
      const esRolMovil =
        motivoParam === 'rol_restringido' ||
        rolDetectadoNumero === 1 ||
        rolDetectadoNumero === 2;

      if (esRolMovil) {
        return {
          codigo: 403,
          etiquetaHttp: '403 Forbidden',
          insigniaSeguridad: 'Route Guard RBAC • Acceso Restringido',
          titulo: 'No cuentas con privilegios para este portal',
          mensajePrincipal:
            'Tu cuenta fue identificada correctamente, pero carece de privilegios administrativos para operar en el Panel Web Municipal.',
          detalleInstitucional:
            'Los perfiles de Ciudadano y Trabajador Operativo utilizan exclusivamente la Aplicación Móvil de Mejora SJR. Este entorno web está reservado para Directores de Dependencia (IdRol: 3) y Superadministradores (IdRol: 4).',
          rutaSolicitada: origenParam || '/dashboard',
          rolDetectadoTexto,
        };
      }

      return {
        codigo: 403,
        etiquetaHttp: '403 Forbidden',
        insigniaSeguridad: 'Route Guard RBAC • Privilegios Insuficientes',
        titulo: 'Acceso restringido por nivel de privilegios',
        mensajePrincipal:
          'No posees los privilegios requeridos para ingresar a este módulo de administración municipal.',
        detalleInstitucional:
          'La gestión global de plantilla y configuración crítica está reservada exclusivamente al perfil de Superadministrador / Alcaldía (IdRol: 4). Tu sesión departamental permanece protegida.',
        rutaSolicitada: origenParam || '/admin/personal',
        rolDetectadoTexto,
      };
    }

    return {
      codigo: 404,
      etiquetaHttp: '404 Not Found',
      insigniaSeguridad: 'Navegación Municipal • Recurso No Localizado',
      titulo: 'Página o módulo no encontrado',
      mensajePrincipal:
        'La dirección solicitada no existe, fue reubicada o aún no se encuentra habilitada en el portal administrativo.',
      detalleInstitucional:
        'Verifica que la dirección URL esté escrita correctamente o regresa al Panel Ejecutivo para continuar con la supervisión de reportes ciudadanos.',
      rutaSolicitada: origenParam || pathname || null,
      rolDetectadoTexto,
    };
  }, [codigo, motivoParam, origenParam, pathname, rolDetectadoNumero, rolDetectadoTexto]);

  const irADashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const irALogin = useCallback(() => {
    router.push('/login');
  }, [router]);

  const cambiarDeCuenta = useCallback(() => {
    authService.logout();
    router.push('/login');
  }, [authService, router]);

  return {
    descriptor,
    tieneSesionAdminValida,
    irADashboard,
    irALogin,
    cambiarDeCuenta,
  };
}

