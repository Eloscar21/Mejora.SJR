import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mejora SJR - Panel Administrativo',
  description: 'Sistema Integral de Gestión de Incidencias Urbanas - Municipio de San Juan del Río',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
