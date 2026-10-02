# ServiceBank — Actividad 6

**Autora y única integrante: Adriana Ramirez Bernal.**

Arquitectura de Software 20262, octavo semestre. Tecnológica del Oriente, Institución de Educación Superior. Docente: Ing. Jorge Luis Martinez Sanchez.

Versión de la Actividad 6 que evoluciona ServiceBank para evaluar la navegación de solicitudes. Incluye búsqueda exacta por código, búsqueda por asunto, cuatro filtros combinables, paginación de 20 registros, conservación del contexto al cerrar el detalle y comparación de búsqueda secuencial e indexada.

## Ejecución

Se requiere Node.js 24 o posterior para ejecutar directamente las pruebas TypeScript. La aplicación conserva Next.js 16.2.6, React 19.2.6 y TypeScript 5.9.3 del proyecto original.

```text
npm ci
npm run dev
```

Abrir `http://localhost:3000`. También puede utilizarse `pnpm install` y `pnpm dev`.

## Validación

```text
npm test
npm run benchmark
npm run build -- --webpack
npm start
```

Las pruebas cubren correctitud, filtros, paginación, visibilidad por perfil, actualización del índice, persistencia fallida, duplicados y migración de fechas. El benchmark de terminal conserva sus resultados en `docs/resultados/benchmark-node.*`; sus tiempos no equivalen a los del navegador.

En **Evaluación**, ejecutar la comparación para medir este navegador. Se generan conjuntos independientes de 100, 1.000 y 10.000 solicitudes sin reemplazar los datos de la mesa de servicio. Los botones JSON y CSV exportan estadísticas y muestras originales.

## Organización

- `app/page.tsx`: interfaz, navegación y acciones sobre solicitudes.
- `lib/navigation.ts`: repositorio, estrategias, servicio y estado de navegación.
- `lib/benchmark.ts`: mediciones y exportación CSV.
- `tests/navigation.test.mjs`: 20 pruebas automatizadas.
- `docs/VALIDACION-ACTIVIDAD-6.md`: comprobaciones, resultados y limitaciones.
- `docs/evidencias/`: capturas del prototipo local.
- `docs/resultados/`: mediciones del navegador y de Node, identificadas por separado.

## Datos y perfiles

Se conserva la clave `servicebank-tickets-v2`. Las fechas de creación anteriores se migran en memoria a ISO. Los datos dañados se informan y se conservan. Las escrituras se completan antes de actualizar la instantánea e invalidar el índice.

Colaborador simula a Usuario Demo 01; Técnico simula a Técnico Demo A; Agente y Administrador consultan todas las solicitudes. Estas restricciones del navegador no constituyen autenticación o autorización de servidor. Solo se utilizan datos ficticios.

## Estado de entrega

Código y comprobaciones preparados localmente el 2 de octubre de 2026. El código de esta versión se publica en este repositorio. La comprobación del despliegue actualizado en Vercel permanece pendiente. Las capturas se incluyen en el paquete de entrega. `docs/PRUEBAS.md` y `docs/README-ANTERIOR.md` son documentos históricos del proyecto anterior.

La evaluación mide crecimiento de registros en un navegador, no concurrencia ni infraestructura. El índice acelera búsquedas exactas repetidas y requiere preparación. La búsqueda textual continúa recorriendo registros. Carga inicial JSON, escrituras y renderizado no forman parte de los tiempos del servicio en memoria.
