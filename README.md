# central-gps

Frontend de **CentralGPS**, plataforma de rastreo y gestión de vehículos por GPS. Permite monitorear unidades en tiempo real sobre un mapa, administrar catálogos (unidades, clientes, operadores, puntos de interés), y compartir el rastreo de una unidad mediante un enlace público con token.

Es la interfaz del backend [`central-gps-api`].

## Stack

- **React 19** + **TypeScript** sobre **Vite 7**
- **Tailwind CSS 4** para estilos
- **TanStack Query** para estado de servidor
- **Zustand** para estado global de cliente
- **React Router** con carga diferida por ruta
- **Google Maps JS API** (AdvancedMarkerElement) para el mapa
- **Zod** para validación de formularios

## Ejecución con Docker (recomendado)

En desarrollo, el frontend corre dentro de un contenedor orquestado por el repo de infraestructura (`docker-compose.yml` / `podman compose`), junto con la API, la base de datos y Redis.

Desde el repo de infraestructura:

```bash
podman compose up -d --build        # levanta web + API + DB + Redis
podman compose ps                   # verifica que los contenedores estén healthy
```

> **Importante:** las imágenes usan `COPY` al construirse, así que `podman compose restart` **no** recarga el código. Tras cambiar código, reconstruye con `--build`.

## Ejecución standalone (sin Docker)

Para desarrollar el frontend de forma aislada, con hot reload:

```bash
npm install
npm run dev       # ejecutar
```

## Variables de entorno

Crea un archivo `.env` en la raíz. Los valores van **sin comillas**:

```
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=tu_clave_de_google_maps
VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
```

## Estructura del proyecto

El código se organiza por **features** (funcionalidades). Cada feature agrupa todo lo que necesita y sigue un patrón interno consistente:

```
features/<feature>/
├── components/   # componentes de UI (Cards, Modals, Views, Tabs)
├── hooks/        # hooks propios de la feature
├── services/     # llamadas a la API
├── types/        # tipos TypeScript (kebab-case.types.ts)
├── lib/          # utilidades puras
└── pages/        # páginas enrutadas
```

Cada página se carga de forma diferida (`lazy`), generando un chunk independiente que solo se descarga cuando el usuario navega a ella.

## Autenticación y permisos

La sesión usa JWT. Las rutas privadas viven bajo `/home` y están protegidas por `PrivateRoute`. El acceso a cada módulo se controla por permisos (`PermisoRoute`), y el panel ERP por rol (`ErpRoute`, solo `sudo_erp`). El rastreo público (`/track/unit/:token`) no requiere login: el token es la credencial.

## Zona horaria

Toda la aplicación trabaja en `America/Mexico_City` (UTC-6) de extremo a extremo. Las fechas sin offset que llegan de la API se interpretan en esa zona.