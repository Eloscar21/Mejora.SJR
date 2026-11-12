import type { Categoria } from '../../models/catalogo.types';
import type { FotoReporteEjemplo, UbicacionReporteEjemplo } from '../../models/reporteEjemplo.types';

/** Fuente explícita de datos de ejemplo; no crea reportes ni simula respuestas de guardado. */
export interface IReporteEjemploService {
  obtenerUbicacion(): UbicacionReporteEjemplo;
  obtenerFoto(categoria: Categoria): FotoReporteEjemplo | null;
}
