'use client';

import { useId } from 'react';
import { KeyRound, Loader2, LockKeyhole } from 'lucide-react';
import type { useCambioPasswordViewModel } from '../../viewModels/useCambioPasswordViewModel';

type VM = ReturnType<typeof useCambioPasswordViewModel>;

/** Formulario de presentación; la validación y el envío pertenecen al ViewModel. */
export function CambioPasswordForm({ viewModel: vm }: { viewModel: VM }) {
  const id = useId();
  const campos = [
    { campo: 'passwordActual', etiqueta: 'Contraseña actual', autoComplete: 'current-password' },
    { campo: 'passwordNueva', etiqueta: 'Nueva contraseña', autoComplete: 'new-password' },
    { campo: 'confirmarPassword', etiqueta: 'Confirmar nueva contraseña', autoComplete: 'new-password' },
  ] as const;

  return (
    <section aria-labelledby={`${id}-titulo`} className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-start gap-3 border-b border-slate-100 p-6">
        <span className="rounded-xl bg-sky-50 p-2.5 text-[#0A3D62]"><LockKeyhole aria-hidden="true" className="h-5 w-5" /></span>
        <div>
          <h2 id={`${id}-titulo`} className="text-lg font-semibold text-slate-900">Mi contraseña</h2>
          <p className="mt-1 text-sm text-slate-500">Actualiza el acceso a tu cuenta.</p>
        </div>
      </header>
      <form noValidate onSubmit={event => { event.preventDefault(); void vm.enviar(); }} aria-busy={vm.isSubmitting} className="space-y-5 p-6">
        {vm.errorEnvio && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{vm.errorEnvio}</p>}
        {vm.mensajeExito && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{vm.mensajeExito}</p>}
        {vm.avisoIncierto && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{vm.avisoIncierto}</p>}
        <fieldset disabled={!vm.puedeEnviar} className="space-y-4">
          <legend className="sr-only">Cambio de contraseña propia</legend>
          {campos.map(({ campo, etiqueta, autoComplete }) => (
            <div key={campo}>
              <label htmlFor={`${id}-${campo}`} className="block text-sm font-medium text-slate-700">{etiqueta}</label>
              <input id={`${id}-${campo}`} type="password" autoComplete={autoComplete}
                value={vm.form[campo]} onChange={event => vm.cambiarCampo(campo, event.target.value)}
                aria-required="true" aria-invalid={Boolean(vm.errors[campo])}
                aria-describedby={vm.errors[campo] ? `${id}-${campo}-error` : campo === 'passwordNueva' ? `${id}-ayuda` : undefined}
                className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${vm.errors[campo] ? 'border-red-400 bg-red-50 focus:ring-red-100' : 'border-slate-300 focus:border-[#0A3D62] focus:ring-sky-100'}`} />
              {vm.errors[campo] && <p id={`${id}-${campo}-error`} className="mt-1 text-xs text-red-700">{vm.errors[campo]}</p>}
              {campo === 'passwordNueva' && <p id={`${id}-ayuda`} className="mt-1.5 text-xs text-slate-500">Usa al menos 8 caracteres y una clave diferente de la actual.</p>}
            </div>
          ))}
        </fieldset>
        {vm.estado === 'confirmado' ? (
          <button type="button" onClick={vm.nuevoCambio} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Realizar otro cambio</button>
        ) : vm.resultadoDesconocido ? (
          <button type="button" onClick={() => void vm.volverAlLogin()} disabled={vm.reautenticando} className="w-full rounded-xl bg-[#0A3D62] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#082f4d] disabled:opacity-50">{vm.reautenticando ? 'Cerrando sesión…' : 'Volver al login para comprobar'}</button>
        ) : (
          <button type="submit" disabled={!vm.puedeEnviar} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A3D62] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#082f4d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50">
            {vm.isSubmitting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <KeyRound aria-hidden="true" className="h-4 w-4" />}
            {vm.isSubmitting ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        )}
        <p className="text-xs leading-relaxed text-slate-500">Tu contraseña actual se usa para confirmar tu identidad antes del cambio.</p>
      </form>
    </section>
  );
}
