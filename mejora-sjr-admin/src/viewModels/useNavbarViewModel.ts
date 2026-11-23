/**
 * useNavbarViewModel.ts
 * ViewModel MVVM para la barra superior institucional (Navbar).
 * Cumple SRP y DIP: encapsula la lectura de sesión a través de IAuthService.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { IAuthService } from '../services/contracts/IAuthService';
import { DEPARTAMENTOS_SJR, ROLES_SJR, type UsuarioSession } from '../models/auth.types';

export function useNavbarViewModel(authService: IAuthService) {
  const [usuario, setUsuario] = useState<UsuarioSession | null>(null);

  useEffect(() => {
    const userSession = authService.obtenerUsuario();
    if (userSession) {
      setUsuario(userSession);
    } else {
      const decoded = authService.decodificarToken();
      if (decoded) {
        setUsuario({
          idUsuario: decoded.idUsuario,
          nombre: decoded.email.split('@')[0],
          email: decoded.email,
          idRol: decoded.idRol,
          idDepartamento: decoded.idDepartamento,
        });
      }
    }
  }, [authService]);

  const rolNombre = useMemo(() => {
    return usuario?.idRol
      ? ROLES_SJR[usuario.idRol as keyof typeof ROLES_SJR] || `Rol ${usuario.idRol}`
      : 'Cargando...';
  }, [usuario]);

  const deptoNombre = useMemo(() => {
    if (usuario?.idDepartamento) {
      return (
        DEPARTAMENTOS_SJR[usuario.idDepartamento as keyof typeof DEPARTAMENTOS_SJR] ||
        `Depto ${usuario.idDepartamento}`
      );
    }
    return usuario?.idRol === 4 ? 'Municipio General (Superadmin)' : 'Sin Departamento';
  }, [usuario]);

  return {
    usuario,
    rolNombre,
    deptoNombre,
  };
}
