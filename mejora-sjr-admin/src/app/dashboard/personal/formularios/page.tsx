import { notFound } from 'next/navigation';
import { PersonalPruebas } from '../../../../providers/PersonalPruebas';

/** Acceso de desarrollo mientras se integra la tabla oficial de US-009. */
export default function PersonalFormulariosPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PersonalPruebas />;
}
