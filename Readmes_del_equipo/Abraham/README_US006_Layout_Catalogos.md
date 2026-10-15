# Historia de Usuario: Layout del Dashboard y Catálogos Dinámicos (US-006)
**Desarrollador:** Oscar Abraham Granados  
**Área:** Front-End Web (`mejora-sjr-admin/`)  
**Rama:** `sP1`  
**Estado:** Completado (Fase 1: Layout MVVM + Fase 2: Catálogos Desacoplados)

---

## 1. Resumen y Valor de Negocio

Proveer la infraestructura base de interfaz y navegación modular para el panel administrativo de **Mejora SJR (Municipio de San Juan del Río)**. Garantiza la separación estricta entre la lógica de presentación y el renderizado visual (patrón **MVVM**), sentando los contratos de datos y servicios para el consumo reactivo y filtrado en cascada de los catálogos municipales (Departamentos, Categorías, Estados y Roles), sin bloquearse por la disponibilidad de los endpoints de backend gracias al principio de **Sustitución de Liskov**.

---

## 2. Diagrama de Arquitectura Global (MVVM Estricto)

```mermaid
flowchart TD
    subgraph Capa_Modelos_y_Contratos [src/models/ & src/services/contracts/ (ISP)]
        NavTypes[navigation.types.ts<br/>NavigationItem, INavigationViewModel]
        CatTypes[catalogo.types.ts<br/>Departamento, Categoria, Estado, Rol]
        ICatService[<<interface>> ICatalogoService<br/>obtenerDepartamentos(), obtenerCategorias(), etc.]
    end

    subgraph Capa_Servicios [src/services/ (LSP / DIP)]
        MockService[MockCatalogoService<br/>Datos Semilla Azure SQL en memoria]
        ApiService[CatalogoApiService<br/>Llamadas HTTP REST a Node.js]
        ICatService -.->|Implementa| MockService
        ICatService -.->|Implementa| ApiService
    end

    subgraph Capa_ViewModels [src/viewModels/ (SRP / OCP)]
        NavVM[useNavigationViewModel.ts<br/>- isSidebarOpen<br/>- currentPath<br/>- toggleSidebar()]
        CatVM[useCatalogoViewModel.ts<br/>- departamentos<br/>- filteredCategorias<br/>- seleccionarDepartamento()]
    end

    subgraph Capa_Vistas_y_Componentes [src/views/ & src/components/ (Dumb UI / SRP)]
        DashboardLayout[DashboardLayout.tsx<br/>Orquestador del Layout]
        Navbar[Navbar.tsx<br/>Dumb Component + headerActionsSlot]
        Sidebar[Sidebar.tsx<br/>Dumb Component + ICON_MAP]
        CatSelect[CatalogoSelect.tsx<br/>Dumb Select Reutilizable]
        CascadeFilter[FiltroDepartamentoCategorias.tsx<br/>Filtro Reactivo en Cascada]
    end

    %% Relaciones
    NavTypes --> NavVM
    CatTypes --> ICatService
    ICatService -->|Inyección de Dependencias| CatVM

    NavVM -->|Estado y Callbacks| DashboardLayout
    DashboardLayout -->|Props| Navbar
    DashboardLayout -->|Props| Sidebar

    CatVM -->|Estado Reactivo| CascadeFilter
    CascadeFilter -->|Props| CatSelect
    CascadeFilter -.->|Se monta en| Navbar
```

---

## 3. Matriz de Componentes y Responsabilidades

| Componente | Capa | Ruta | Responsabilidad |
|---|---|---|---|
| `navigation.types.ts` | Modelos | `src/models/` | Contratos tipados de navegación y definición agnóstica de ítems (tokens de iconos en texto, roles permitidos). |
| `catalogo.types.ts` | Modelos | `src/models/` | Entidades de dominio idénticas al esquema relacional de base de datos (`schema.sql`). |
| `ICatalogoService.ts` | Contratos | `src/services/contracts/` | Interfaz abstracta que define las operaciones asíncronas para obtener catálogos. |
| `MockCatalogoService.ts` | Servicios | `src/services/mocks/` | Simulación fiel en memoria con latencia controlada para desarrollo independiente del backend. |
| `CatalogoApiService.ts` | Servicios | `src/services/api/` | Consumo real vía `fetch` contra la API REST de Node.js/Express. |
| `useNavigationViewModel.ts` | ViewModel | `src/viewModels/` | Maneja el estado reactivo del sidebar, la detección de la ruta activa y las acciones de apertura/cierre. |
| `useCatalogoViewModel.ts` | ViewModel | `src/viewModels/` | Gestiona la carga concurrente de catálogos, estados `isLoading`/`error` y el filtrado en cascada departamento $\rightarrow$ categoría. |
| `Sidebar.tsx` | Componente | `src/components/layout/` | Componente tonto que mapea los tokens de texto a iconos de `lucide-react` y emite eventos de navegación. |
| `Navbar.tsx` | Componente | `src/components/layout/` | Barra superior tonta con slot extensible (`headerActionsSlot`) para acciones globales. |
| `DashboardLayout.tsx` | Vista | `src/views/layout/` | Ensambla el esqueleto del panel conectando el ViewModel de navegación con Sidebar y Navbar. |
| `CatalogoSelect.tsx` | Componente | `src/components/catalogo/` | Selector genérico estilizado con estados de carga (spinner), deshabilitado y placeholders. |
| `FiltroDepartamentoCategorias.tsx` | Componente | `src/components/catalogo/` | Conecta los selectores en cascada para filtrar categorías de forma reactiva según el departamento elegido. |

---

## 4. Principios SOLID Implementados

### S — Single Responsibility Principle (Responsabilidad Única)
* **Separación Vista/ViewModel:** `Sidebar.tsx` y `Navbar.tsx` no manejan llamadas a APIs ni estados de enrutamiento complejos; solo reciben `props` y emiten callbacks (`onClose`, `onToggleSidebar`).
* **ViewModels Especializados:** `useNavigationViewModel` se encarga exclusivamente de la navegación; `useCatalogoViewModel` se encarga exclusivamente de los catálogos y sus dependencias.

### O — Open/Closed Principle (Abierto a Extensión, Cerrado a Modificación)
* **Slot Extensible en Navbar:** `Navbar.tsx` expone la propiedad `headerActionsSlot?: React.ReactNode`. Se pueden incrustar filtros globales o selectores de departamento sin modificar una sola línea interna del Navbar.
* **Iconos Desacoplados:** `NavigationItem` utiliza `iconName: string`. Agregar un nuevo ítem de navegación no requiere modificar la interfaz de modelos, únicamente se mapea el token en la vista (`ICON_MAP`).

### L — Liskov Substitution Principle (Sustitución de Liskov)
* `MockCatalogoService` y `CatalogoApiService` implementan exactamente el mismo contrato `ICatalogoService`. El Front-End puede alternar entre trabajar en modo Mock (offline) o conectado a SQL Server sin que ningún ViewModel o componente falle.

### I — Interface Segregation Principle (Segregación de Interfaces)
* Las interfaces `INavigationViewModel` e `ICatalogoService` son atómicas y puntuales. Los componentes solo dependen de los métodos y propiedades que verdaderamente utilizan.

### D — Dependency Inversion Principle (Inversión de Dependencias)
* El ViewModel `useCatalogoViewModel(service: ICatalogoService = defaultService)` depende de una abstracción (`ICatalogoService`), nunca de una biblioteca concreta (`axios`, `fetch`) ni de una URL en duro.

---

## 5. Datos Semilla Utilizados (Fidelidad con `schema.sql`)

Los datos mockeados en `MockCatalogoService.ts` reflejan exactamente la base de datos de San Juan del Río:

* **Departamentos:**
  * `1` — JAPAM
  * `2` — Servicios Públicos
* **Categorías vinculadas por clave foránea (`idDepartamento`):**
  * `1` — Fugas de agua (JAPAM)
  * `2` — Alcantarillado (JAPAM)
  * `3` — Alumbrado (Servicios Públicos)
  * `4` — Bacheo (Servicios Públicos)
* **Estados de Incidencia:** `Recibido`, `En Revisión`, `En Progreso`, `Atendido`, `Rechazado`.
* **Roles:** `Ciudadano`, `Trabajador`, `Admin`, `Superadmin`.

---

## 6. Dependencias Requeridas por el Panel Web

Cuando se ejecute el `npm install` en `mejora-sjr-admin`, el equipo debe asegurarse de contar con:
```bash
npm install next react react-dom lucide-react clsx tailwind-merge
npm install -D typescript @types/react @types/node tailwindcss postcss autoprefixer
```
