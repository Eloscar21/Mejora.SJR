'use client';

import { useId } from 'react';
import { Check, Inbox, Loader2, RefreshCw, Search, X } from 'lucide-react';
import type { EstadoSolicitudPassword } from '../../models/password.types';
import type { useBandejaPasswordViewModel } from '../../viewModels/useBandejaPasswordViewModel';
import type { useResolucionPasswordViewModel } from '../../viewModels/useResolucionPasswordViewModel';

type Bandeja = ReturnType<typeof useBandejaPasswordViewModel>;
type Resolucion = ReturnType<typeof useResolucionPasswordViewModel>;
const estados = {
  PENDIENTE: { texto: 'Pendiente', clase: 'border-amber-200 bg-amber-50 text-amber-800' },
  APROBADA: { texto: 'Aprobada', clase: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  RECHAZADA: { texto: 'Rechazada', clase: 'border-red-200 bg-red-50 text-red-700' },
};
const fecha = (valor: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));

/** Tabla y filtros de presentación. Cada evento se delega al ViewModel correspondiente. */
export function BandejaPasswordView({ viewModel: vm, resolucion }: { viewModel: Bandeja; resolucion: Resolucion }) {
  const id = useId();
  const bloqueado = resolucion.seleccion !== null;
  return (
    <section aria-labelledby={`${id}-titulo`} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-sky-50 p-2.5 text-[#0A3D62]"><Inbox aria-hidden="true" className="h-5 w-5" /></span>
          <div>
            <h2 id={`${id}-titulo`} className="text-lg font-semibold text-slate-900">Solicitudes de recuperación</h2>
            <p className="mt-1 max-w-lg text-sm text-slate-500">Verifica la identidad del solicitante antes de restablecer su acceso.</p>
          </div>
        </div>
        <button type="button" onClick={vm.recargar} disabled={vm.isLoading || bloqueado} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${vm.isLoading ? 'animate-spin' : ''}`} />Actualizar
        </button>
      </header>
      {resolucion.sinConfirmar.length > 0 && (
        <div role="status" className="m-6 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Hay resultados pendientes de comprobar</p>
          {resolucion.sinConfirmar.map(ticket => (
            <div key={ticket.idSolicitud} className="flex flex-wrap items-center justify-between gap-2">
              <span>#{ticket.idSolicitud} · {ticket.nombreUsuario}</span>
              <button type="button" disabled={bloqueado} onClick={() => resolucion.revisarIncierto(ticket.idSolicitud)} className="font-semibold underline underline-offset-2 disabled:opacity-50">Revisar resultado</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3 p-6 sm:flex-row">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-buscar`} className="mb-1.5 block text-xs font-semibold text-slate-600">Buscar solicitante</label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input id={`${id}-buscar`} type="search" value={vm.filtroTexto} onChange={event => vm.cambiarTexto(event.target.value)} disabled={bloqueado}
              placeholder="Nombre, correo o departamento" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#0A3D62] focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50" />
          </div>
        </div>
        <div className="sm:w-44">
          <label htmlFor={`${id}-estado`} className="mb-1.5 block text-xs font-semibold text-slate-600">Estado</label>
          <select id={`${id}-estado`} value={vm.filtroEstado} onChange={event => vm.cambiarEstado(event.target.value as EstadoSolicitudPassword)} disabled={bloqueado}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0A3D62] focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50">
            <option value="PENDIENTE">Pendientes</option><option value="APROBADA">Aprobadas</option><option value="RECHAZADA">Rechazadas</option>
          </select>
        </div>
      </div>
      {vm.errorListado && <p role="alert" className="mx-6 mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{vm.errorListado} Actualiza la bandeja para volver a comprobarla.</p>}
      <div aria-busy={vm.isLoading} className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <caption className="sr-only">Solicitudes de recuperación de contraseña</caption>
          <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
            <th scope="col" className="px-6 py-3 font-semibold">Solicitante</th><th scope="col" className="px-4 py-3 font-semibold">Área</th>
            <th scope="col" className="px-4 py-3 font-semibold">Solicitud</th><th scope="col" className="px-6 py-3 text-right font-semibold">{vm.filtroEstado === 'PENDIENTE' ? 'Acciones' : 'Resolución'}</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {vm.filas.map(solicitud => (
              <tr key={solicitud.idSolicitud} className="align-top hover:bg-slate-50/60">
                <td className="px-6 py-4"><p className="font-semibold text-slate-800">{solicitud.nombreUsuario}</p><p className="mt-1 break-all text-xs text-slate-500">{solicitud.email}</p></td>
                <td className="px-4 py-4"><p className="text-slate-700">{solicitud.departamentoNombre || 'Sin departamento'}</p><p className="mt-1 text-xs text-slate-500">{solicitud.rolNombre}</p></td>
                <td className="px-4 py-4"><p className="mb-2 text-xs font-medium text-slate-500">Ticket #{solicitud.idSolicitud}</p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${estados[solicitud.estado].clase}`}>{estados[solicitud.estado].texto}</span>
                  <p className="mt-2 whitespace-nowrap text-xs text-slate-500">{fecha(solicitud.fechaSolicitud)}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  {solicitud.estado === 'PENDIENTE' ? (
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => resolucion.abrir('aprobar', solicitud.idSolicitud)} disabled={bloqueado || vm.isLoading || Boolean(vm.errorListado)} aria-label={`Aprobar solicitud de ${solicitud.nombreUsuario}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A3D62] px-3 py-2 text-xs font-semibold text-white hover:bg-[#082f4d] disabled:opacity-40"><Check aria-hidden="true" className="h-3.5 w-3.5" />Aprobar</button>
                      <button type="button" onClick={() => resolucion.abrir('rechazar', solicitud.idSolicitud)} disabled={bloqueado || vm.isLoading || Boolean(vm.errorListado)} aria-label={`Rechazar solicitud de ${solicitud.nombreUsuario}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"><X aria-hidden="true" className="h-3.5 w-3.5" />Rechazar</button>
                    </div>
                  ) : <div className="max-w-xs text-xs text-slate-600"><p>{solicitud.notasResolucion || 'Sin notas de resolución'}</p>{solicitud.fechaResolucion && <p className="mt-2 text-slate-400">{fecha(solicitud.fechaResolucion)}</p>}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {vm.isLoading && <p role="status" className="flex items-center justify-center gap-2 p-6 text-sm text-slate-500"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Consultando solicitudes…</p>}
      {!vm.isLoading && !vm.errorListado && vm.filas.length === 0 && <div className="px-6 py-12 text-center"><Inbox aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="font-medium text-slate-700">No hay solicitudes para estos filtros</p><p className="mt-1 text-sm text-slate-500">Las solicitudes del personal aparecerán aquí.</p></div>}
      <footer className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">{vm.filas.length} de {vm.total} solicitudes</footer>
    </section>
  );
}
