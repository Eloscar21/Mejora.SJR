'use client';

import { useId } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import type { useResolucionPasswordViewModel } from '../../viewModels/useResolucionPasswordViewModel';

type VM = ReturnType<typeof useResolucionPasswordViewModel>;

export function ResolucionPasswordDialog({ viewModel: vm }: { viewModel: VM }) {
  const id = useId();
  if (!vm.seleccion) return null;
  const aprobar = vm.seleccion.tipo === 'aprobar';
  const bloqueado = vm.isSubmitting || vm.comprobando || vm.copiando;
  const terminado = vm.estado === 'confirmado' || vm.estado === 'verificado';
  return (
    <Modal titulo={aprobar ? 'Aprobar recuperación de acceso' : 'Rechazar solicitud'}
      descripcion={`Ticket #${vm.seleccion.solicitud.idSolicitud}`} bloqueado={bloqueado} onCerrar={() => { vm.cerrar(); }}>
      <form noValidate onSubmit={event => { event.preventDefault(); void vm.confirmar(); }} aria-busy={bloqueado} className="space-y-5 p-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-900">{vm.seleccion.solicitud.nombreUsuario}</p><p className="mt-1 break-all text-sm text-slate-600">{vm.seleccion.solicitud.email}</p><p className="mt-1 text-xs text-slate-500">{vm.seleccion.solicitud.departamentoNombre || 'Sin departamento'}</p></div>
        {vm.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{vm.error}</p>}
        {vm.estado === 'incierto' && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">El resultado requiere comprobación. Consulta el estado antes de intentar otro envío. Cerrar el diálogo conservará este aviso.</p>}
        {vm.mensaje && <p role="status" className={`rounded-xl border p-3 text-sm ${vm.estado === 'confirmado' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{vm.mensaje}</p>}
        {!terminado && <fieldset disabled={!vm.puedeConfirmar}>
          <legend className="sr-only">Confirmación de resolución</legend>
          <label htmlFor={`${id}-detalle`} className="text-sm font-medium text-slate-700">{aprobar ? 'Notas de verificación (opcional)' : 'Motivo de rechazo'}</label>
          <textarea id={`${id}-detalle`} rows={3} maxLength={255} value={aprobar ? vm.notas : vm.motivo}
            onChange={event => aprobar ? vm.cambiarNotas(event.target.value) : vm.cambiarMotivo(event.target.value)}
            aria-required={!aprobar} aria-invalid={Boolean(vm.errorCampo)} aria-describedby={vm.errorCampo ? `${id}-error` : `${id}-ayuda`}
            className={`mt-1.5 w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:ring-2 disabled:bg-slate-50 ${vm.errorCampo ? 'border-red-400 bg-red-50 focus:ring-red-100' : 'border-slate-300 focus:border-[#0A3D62] focus:ring-sky-100'}`} />
          {vm.errorCampo && <p id={`${id}-error`} className="mt-1 text-xs text-red-700">{vm.errorCampo}</p>}
          <p id={`${id}-ayuda`} className="mt-1.5 text-xs text-slate-500">{aprobar ? 'Confirma que verificaste la identidad del empleado. Al aprobar se sustituirá su contraseña.' : 'Explica el rechazo con al menos 5 caracteres.'}</p>
        </fieldset>}
        {vm.claveConfirmada && <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <label htmlFor={`${id}-clave`} className="block text-sm font-semibold text-emerald-950">Clave temporal</label>
          <input id={`${id}-clave`} value={vm.claveConfirmada.passwordTemporal} readOnly autoComplete="off" spellCheck={false} onFocus={event => event.target.select()}
            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 font-mono text-base tracking-wide text-slate-900 outline-none focus:ring-2 focus:ring-emerald-200" />
          <button type="button" onClick={() => void vm.copiarClave()} disabled={vm.copiando} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900 disabled:opacity-50"><Copy aria-hidden="true" className="h-4 w-4" />{vm.copiando ? 'Copiando…' : 'Copiar clave'}</button>
          {vm.mensajeCopiado && <p role="status" className="text-xs text-emerald-900">{vm.mensajeCopiado}</p>}
          <p className="text-xs leading-relaxed text-emerald-900">Al cerrar, esta clave dejará de mostrarse y no podrás consultarla de nuevo. Entrégala antes de salir del diálogo.</p>
        </div>}
        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button type="button" onClick={() => vm.cerrar()} disabled={bloqueado} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{terminado ? 'Cerrar' : 'Cancelar'}</button>
          {vm.puedeComprobar && <button type="button" onClick={() => void vm.comprobarResultado()} disabled={bloqueado} className="rounded-xl border border-[#0A3D62] px-4 py-2.5 text-sm font-semibold text-[#0A3D62] disabled:opacity-50">Consultar estado</button>}
          {vm.puedeConfirmar && <button type="submit" disabled={bloqueado} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${aprobar ? 'bg-[#0A3D62] hover:bg-[#082f4d]' : 'bg-red-700 hover:bg-red-800'}`}>{vm.estado === 'reintentoDisponible' ? 'Reintentar manualmente' : aprobar ? 'Aprobar y generar clave' : 'Confirmar rechazo'}</button>}
          {bloqueado && <span role="status" className="inline-flex items-center gap-2 text-sm text-slate-600"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />{vm.comprobando ? 'Comprobando estado…' : vm.copiando ? 'Copiando…' : 'Guardando resolución…'}</span>}
        </footer>
      </form>
    </Modal>
  );
}
