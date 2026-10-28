'use client';

import { useEffect, useRef, useState } from 'react';
import type { Empleado } from '../models/empleado.types';
import type { AccionFormularioPersonal, CambioPersonal } from '../models/personalFormulario.types';
import type { IAuthService } from '../services/contracts/IAuthService';
import type { IEmpleadoConsultaService } from '../services/contracts/IEmpleadoConsultaService';

/** Integra los formularios en desarrollo sin implementar la tabla de US-009. */
export function usePersonalPruebasViewModel(
  sesion: Pick<IAuthService, 'obtenerToken' | 'decodificarToken'>,
  consulta: IEmpleadoConsultaService
) {
  const [inicializando, setInicializando] = useState(true);
  const [idRolActor, setIdRolActor] = useState<number | null>(null);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [idSeleccionado, setIdSeleccionado] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorListado, setErrorListado] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [accion, setAccion] = useState<AccionFormularioPersonal | null>(null);
  const [revision, setRevision] = useState(0);
  const listaDisponible = useRef(false);

  useEffect(() => {
    let vigente = true;
    listaDisponible.current = false;
    setIsLoading(true);
    setErrorListado(null);

    const cargar = async () => {
      try {
        const token = sesion.obtenerToken();
        const payload = token ? sesion.decodificarToken(token) : null;
        if (!payload || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) ||
          payload.exp <= Date.now() / 1000) {
          setIdRolActor(null);
          setErrorAcceso('Inicia sesión con una cuenta vigente para continuar.');
          return;
        }
        if (payload.idRol !== 4) {
          setIdRolActor(payload.idRol);
          setErrorAcceso('Esta pantalla está disponible solo para el superadministrador.');
          return;
        }
        setIdRolActor(4);
        setErrorAcceso(null);

        const lista = await consulta.listarEmpleados();
        if (vigente) {
          listaDisponible.current = true;
          setEmpleados(lista);
          setIdSeleccionado((actual) => lista.some((item) => item.idUsuario === actual) ? actual : null);
        }
      } catch (error: unknown) {
        if (vigente) {
          const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : null;
          if (status === 401 || status === 403) {
            setIdRolActor(null);
            setErrorAcceso(status === 401
              ? 'La sesión no es válida. Inicia sesión nuevamente.'
              : 'El servidor no permite gestionar empleados con esta cuenta.');
          }
          setErrorListado(error instanceof Error ? error.message : 'No se pudo actualizar la lista de empleados.');
        }
      } finally {
        if (vigente) {
          setInicializando(false);
          setIsLoading(false);
        }
      }
    };
    void cargar();
    return () => { vigente = false; };
  }, [sesion, consulta, revision]);

  const puedeGestionar = idRolActor === 4 && !errorAcceso;
  const empleadoSeleccionado = empleados.find((item) => item.idUsuario === idSeleccionado) ?? null;
  const puedeUsarSeleccion = puedeGestionar && !isLoading && !errorListado &&
    Boolean(empleadoSeleccionado?.activo) && !accion;

  function seleccionarEmpleado(valor: string) {
    if (accion || !listaDisponible.current) return;
    const id = Number(valor);
    const empleado = empleados.find((item) => item.idUsuario === id && item.activo);
    setIdSeleccionado(empleado?.idUsuario ?? null);
  }

  function abrirCrear() {
    if (puedeGestionar && !accion) setAccion({ tipo: 'crear' });
  }

  function abrirSeleccionado(tipo: 'editar' | 'desactivar') {
    if (puedeUsarSeleccion && listaDisponible.current && empleadoSeleccionado) {
      setAccion({ tipo, empleado: { ...empleadoSeleccionado } });
    }
  }

  function recargar() {
    if (!puedeGestionar || accion) return;
    listaDisponible.current = false;
    setIsLoading(true);
    setRevision((actual) => actual + 1);
  }

  function procesarCambioConfirmado(cambio: CambioPersonal) {
    if (!puedeGestionar) return;
    // Aplicar solo resultados ya confirmados; la recarga tiene sus propios errores.
    setEmpleados((actual) => cambio.tipo === 'desactivado'
      ? actual.filter((item) => item.idUsuario !== cambio.idUsuario)
      : [...actual.filter((item) => item.idUsuario !== cambio.empleado.idUsuario), cambio.empleado]);
    setMensajeExito(cambio.tipo === 'creado' ? 'Empleado creado correctamente.'
      : cambio.tipo === 'actualizado' ? 'Cambios guardados correctamente.'
      : 'Empleado desactivado correctamente.');
    setIdSeleccionado(null);
    listaDisponible.current = false;
    setIsLoading(true);
    setRevision((actual) => actual + 1);
  }

  return {
    inicializando, idRolActor, puedeGestionar, errorAcceso,
    empleados, idSeleccionado, isLoading, errorListado, mensajeExito, accion, puedeUsarSeleccion,
    seleccionarEmpleado, abrirCrear,
    abrirEditar: () => abrirSeleccionado('editar'),
    abrirDesactivar: () => abrirSeleccionado('desactivar'),
    cerrarFormulario: () => setAccion(null), recargar, procesarCambioConfirmado,
  };
}
