/**
 * SolicitarRecuperacionModal.tsx
 * Modal accesible desde el Login para que trabajadores y administradores soliciten asistencia al Superadmin (US-028 / US-029).
 */

'use client';

import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  emailInicial?: string;
  apiUrl?: string;
}

export const SolicitarRecuperacionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  emailInicial = '',
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
}) => {
  const [email, setEmail] = useState(emailInicial);
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa un correo electrónico institucional válido.');
      return;
    }

    setCargando(true);
    setError(null);
    setMensajeExito(null);

    try {
      const cleanBase = apiUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanBase}/solicitudes-password/solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const body = await res.json();
      if (!res.ok && res.status !== 200) {
        throw new Error(body.message || 'No se pudo enviar la solicitud.');
      }

      setMensajeExito(body.message || 'Solicitud enviada al Superadministrador con éxito.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const handleCerrar = () => {
    setError(null);
    setMensajeExito(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-[#0b132b] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-bold tracking-tight">Recuperar Contraseña Institucional</h3>
          </div>
          <button
            onClick={handleCerrar}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {mensajeExito ? (
            <div className="text-center py-4 space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Solicitud Registrada</h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                {mensajeExito}
              </p>
              <div className="pt-4">
                <button
                  onClick={handleCerrar}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md transition-all"
                >
                  Entendido y Volver al Login
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Por políticas de seguridad municipal, las contraseñas son asistidas. Ingresa tu correo y se emitirá una solicitud al <strong>Superadministrador</strong> para que genere tu clave provisional.
              </p>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="recovery-email" className="block text-xs font-medium text-slate-700">
                  Correo Electrónico Institucional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    placeholder="funcionario@japam.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={cargando}
                    className="block w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCerrar}
                  disabled={cargando}
                  className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-1/2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-60"
                >
                  {cargando ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <span>Solicitar Asistencia</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
