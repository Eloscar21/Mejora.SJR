'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  titulo: string;
  descripcion?: string;
  bloqueado?: boolean;
  onCerrar: () => void;
  children: ReactNode;
}

/** Diálogo nativo: foco y teclado pertenecen al comportamiento de presentación. */
export function Modal({ titulo, descripcion, bloqueado = false, onCerrar, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const anterior = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-titulo`}
      aria-describedby={descripcion ? `${id}-descripcion` : undefined}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        if (!bloqueado) onCerrar();
      }}
      className="m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60"
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
        <div>
          <h2 id={`${id}-titulo`} className="text-xl font-semibold">{titulo}</h2>
          {descripcion && <p id={`${id}-descripcion`} className="mt-1 text-sm text-slate-600">{descripcion}</p>}
        </div>
        <button
          type="button"
          aria-label="Cerrar diálogo"
          onClick={onCerrar}
          disabled={bloqueado}
          className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40"
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
