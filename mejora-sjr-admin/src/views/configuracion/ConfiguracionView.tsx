'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import type { useConfiguracionViewModel } from '../../viewModels/useConfiguracionViewModel';
import { CambioPasswordForm } from './CambioPasswordForm';
import { BandejaPasswordView } from './BandejaPasswordView';
import { ResolucionPasswordDialog } from './ResolucionPasswordDialog';

/** Composición visual. Solo consume el estado y los eventos de los ViewModels. */
export function ConfiguracionView({ viewModel: vm }: { viewModel: ReturnType<typeof useConfiguracionViewModel> }) {
  if (vm.acceso.inicializando) return <p role="status" className="flex items-center gap-2 py-12 text-sm text-slate-600"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Cargando configuración…</p>;
  if (!vm.acceso.actor) return <section className="mt-6 max-w-xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm"><h1 className="text-xl font-semibold text-slate-900">Acceso a configuración</h1><p role="alert" className="mt-3 text-sm text-red-800">{vm.cambio.errorEnvio || vm.acceso.errorAcceso}</p><button type="button" onClick={() => void vm.cambio.volverAlLogin()} disabled={vm.cambio.reautenticando} className="mt-5 rounded-xl bg-[#0A3D62] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Volver al login</button></section>;

  return <div className="min-w-0 space-y-6 pb-8 pt-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#0A3D62]">Mi cuenta</p><h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Configuración</h1><p className="mt-2 text-sm text-slate-500">{vm.bandeja.puedeConsultar ? 'Administra tu acceso y atiende las solicitudes de recuperación del personal.' : 'Administra la contraseña de tu cuenta institucional.'}</p></div>
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-600"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-[#0A3D62]" /><span className="break-all">{vm.acceso.actor.email}</span></div>
    </header>
    <div className={vm.bandeja.puedeConsultar ? 'grid min-w-0 items-start gap-6 2xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]' : 'max-w-xl'}>
      <CambioPasswordForm viewModel={vm.cambio} />
      {vm.bandeja.puedeConsultar && <BandejaPasswordView viewModel={vm.bandeja} resolucion={vm.resolucion} />}
    </div>
    {vm.bandeja.puedeConsultar && vm.resolucion.seleccion && <ResolucionPasswordDialog viewModel={vm.resolucion} />}
  </div>;
}
