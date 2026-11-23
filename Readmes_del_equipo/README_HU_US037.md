# Historia de Usuario: US-037

## **Título:** Seguimiento y Transparencia Ciudadana: Semáforo de Estatus, Stepper Visual de 4 Fases y Visor de Evidencia en "Mis Reportes"

- **Módulo:** `mejora-sjr-mobile`
- **Rol:** Rol 1 (Ciudadano)
- **Sprint:** Sprint 7
- **Estado:** ✅ **Implementado y Verificado**

---

### **1. Narrativa Ágil:**
> **Como** ciudadano del municipio de San Juan del Río (Rol 1),  
> **Quiero** que la aplicación móvil me muestre de manera clara, visual e intuitiva en qué fase de atención se encuentra cada uno de mis reportes (Recibido, En revisión, En curso, Atendido),  
> **Para** tener certeza y transparencia sobre el avance del trabajo municipal sin incertidumbre ni textos planos difíciles de interpretar.

---

### **2. Causa Raíz / Necesidad Identificada:**
- En la vista anterior de *"Mis reportes"*, el estado se mostraba como un simple texto plano (ej. *"Recibido"*, *"Atendido"*) en color azul sin jerarquía visual.
- No existía semáforo de colores que distinguiera visualmente si un reporte estaba cerrado (`Atendido`, verde), en atención (`En progreso`, azul), en evaluación (`En revisión`, ámbar) o recién registrado (`Recibido`, gris).
- No había una barra o línea de tiempo gráfica de etapas de resolución municipal.
- El ciudadano no disponía de un mensaje explicativo claro sobre qué significa cada estatus en el flujo del municipio.
- En la pantalla principal (`CrearReporteView`), no existía un acceso destacado o aviso proactivo que le invitara a consultar el estatus en tiempo real de sus solicitudes.

---

### **3. Solución Implementada:**

1. **Semáforo de Estatus con Chips y Colores Institucionales (`ESTADOS_INCIDENCIA`):**
   - **Estado 1 (Recibido):** Badge gris/pizarra (`#64748B`, fondo `#F1F5F9`) con punto indicador.
   - **Estado 2 (En revisión):** Badge ámbar (`#D97706`, fondo `#FEF3C7`).
   - **Estado 3 (En curso / En progreso):** Badge azul institucional (`#2563EB`, fondo `#DBEAFE`).
   - **Estado 4 (Atendido):** Badge verde de éxito (`#16A34A`, fondo `#DCFCE7`).
   - **Estado 5 (Rechazado):** Badge rojo de descarte (`#DC2626`, fondo `#FEE2E2`).

2. **Línea de Avance / Stepper Visual de 4 Pasos:**
   - Renderiza un flujo gráfico horizontal de 4 nodos:
     - `1. Recibido` ➔ `2. En revisión` ➔ `3. En curso` ➔ `4. Atendido`
   - Los pasos concluidos se marcan con palomita (`✓`) y color verde/azul.
   - El paso activo se resalta con borde de contraste y tipografía destacada.
   - Las etapas futuras permanecen tenues.

3. **Caja de Explicación de Estado (*Status Callout*):**
   - Cada reporte incluye un recuadro explicativo con el detalle del momento operativo:
     - *Recibido:* "Tu reporte fue recibido exitosamente y se encuentra en espera de asignación técnica por el departamento."
     - *En revisión:* "El departamento municipal está evaluando los requerimientos y asignando la cuadrilla de atención."
     - *En curso:* "¡Cuadrilla en campo! Personal operativo municipal está trabajando activamente en la atención del reporte."
     - *Atendido:* "¡Reporte atendido! La incidencia ha sido resuelta satisfactoriamente por el personal municipal."
     - *Rechazado:* "Reporte descartado o rechazado por no ser procedente o tratarse de un duplicado."

4. **Visor de Evidencia Fotográfica Inicial:**
   - Si el reporte contiene `fotoInicialUrl`, se muestra una miniatura con etiqueta interactiva `🔍 Toca para ampliar evidencia`.
   - Al tocarla, se abre un `<Modal>` a pantalla completa con botón para cerrar.

5. **Banner Proactivo en Pantalla de Inicio (`CrearReporteView`):**
   - Se añadió un banner de llamada a la acción en la pantalla del ciudadano:
     `📢 Seguimiento de tus reportes · Revisa el avance en tiempo real (Recibido, En curso, Atendido)`.

6. **Pestañas de Filtrado Rápido y Métricas en `MisReportesView`:**
   - Contadores: Total, En proceso, Atendidos.
   - Filtros: `Todas`, `En proceso`, `Atendidas`.

---

### **4. Criterios de Aceptación (Gherkin):**

```gherkin
Escenario: Visualización clara del semáforo y estatus Atendido
  Dado que el ciudadano consulta "Mis reportes"
  Y tiene un reporte #5 con estado 4 (Atendido)
  Entonces el reporte muestra el badge verde "Atendido"
  Y el stepper gráfico marca los 4 pasos completados con "✓"
  Y el callout explica "¡Reporte atendido! La incidencia ha sido resuelta satisfactoriamente".

Escenario: Seguimiento en tiempo real de reporte en proceso
  Dado que el ciudadano tiene un reporte #6 con estado 1 (Recibido)
  Entonces el stepper resalta el paso 1 "Recibido" como activo
  Y los pasos 2, 3 y 4 se muestran como fases pendientes
  Y el callout informa que está en espera de asignación técnica.

Escenario: Consulta de fotografía de evidencia inicial
  Dado que un reporte ciudadano incluye fotografía de evidencia
  Cuando el ciudadano toca la miniatura en "Mis reportes"
  Entonces se abre el visor modal en pantalla completa para inspeccionar la fotografía.
```

---

### **5. Pruebas Automatizadas:**
- Suite: `mejora-sjr-mobile/tests/mis-reportes.test.cjs` (**29 de 29 pruebas pasadas**).
- Suite: `mejora-sjr-mobile/tests/reporte-form.test.cjs` (**27 de 27 pruebas pasadas**).
- Suite: `mejora-sjr-mobile/tests/us035-propagacion-categorias.test.cjs` (**2 de 2 pruebas pasadas**).
