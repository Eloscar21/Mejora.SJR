import type { Categoria } from '../../models/catalogo.types';
import type { FotoReporteEjemplo, UbicacionReporteEjemplo } from '../../models/reporteEjemplo.types';
import type { IReporteEjemploService } from '../contracts/IReporteEjemploService';

const FOTOS: Readonly<Record<number, FotoReporteEjemplo>> = {
  1: {
    url: 'https://www.nps.gov/romo/learn/news/images/NPS-Photo_Moraine-Park-Water-System_Damaged-Pipes_1.JPG',
    descripcion: 'Ejemplo de tubería dañada con fuga de agua.',
    credito: 'NPS / Rocky Mountain National Park · dominio público',
  },
  2: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Manhole.jpg',
    descripcion: 'Ejemplo de un registro de alcantarillado.',
    credito: 'Scott Ehardt · dominio público',
  },
  3: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Street_lamp_angled_mast_%28close_up%29.jpg',
    descripcion: 'Ejemplo de una luminaria de alumbrado público.',
    credito: 'Jengelh / Mannivu · CC0',
  },
  4: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Pothole_Big.jpg',
    descripcion: 'Ejemplo de un bache en la superficie de una vialidad.',
    credito: 'Uncl3dad · dominio público',
  },
};

/** Fixtures por las categorías actuales del catálogo; nunca elige fotos aleatorias. */
export class MockReporteEjemploService implements IReporteEjemploService {
  obtenerUbicacion(): UbicacionReporteEjemplo {
    return { latitud: 20.3889, longitud: -99.9961, referencia: 'Centro de San Juan del Río, Querétaro (ubicación de ejemplo).' };
  }

  obtenerFoto(categoria: Categoria): FotoReporteEjemplo | null {
    const foto = FOTOS[categoria.idCategoria];
    return foto ? { ...foto } : null;
  }
}
