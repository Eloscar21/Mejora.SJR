# US-036 · Interacción Operativa en Campo: Visualización de Evidencias Fotográficas y Cambio de Estado de Incidencias

**Responsable:** Miguel Leal (Mobile Developer)  
**Módulo:** Aplicación Móvil (`mejora-sjr-mobile`)  
**Rama:** `sP7`  
**Estado:** ✅ Completado y Verificado  

---

## 1. Alcance Móvil

1. **Visor de Evidencias:**
   - En `TareaCard` se muestra una miniatura de la fotografía (`fotoInicialUrl`) con botón para abrirla en `<Modal>` a pantalla completa.
   - Si la incidencia no cuenta con fotografía, se indica un distintivo informativo: *"📷 Sin fotografía adjunta en el reporte"*.
2. **Cambio de Estado Interactivo:**
   - Integración de botones de acción directa en cada tarjeta según su estado:
     - Estado 2 (En revisión): *"▶️ Poner en marcha (En curso)"* y *"✔️ Marcar Atendida"*.
     - Estado 3 (En curso): *"✔️ Finalizar y Atender"* y *"↩️ En revisión"*.
     - Estado 4 (Atendida): *"Reanudar atención"*.
   - Consumo de `PATCH /api/incidencias/:id/estado` con Bearer JWT.
   - Actualización reactiva instantánea de tarjetas y contadores métricos en `useBandejaViewModel.ts`.
