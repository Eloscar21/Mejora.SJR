import type { ICopiadoService } from '../contracts/ICopiadoService';

/** Solo escribe el portapapeles tras una acción explícita; no conserva el texto. */
export class BrowserCopiadoService implements ICopiadoService {
  async copiarTexto(texto: string): Promise<void> {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) throw new Error();
      await navigator.clipboard.writeText(texto);
    } catch {
      throw new Error('No se pudo copiar automáticamente. Selecciona la clave y cópiala manualmente.');
    }
  }
}
