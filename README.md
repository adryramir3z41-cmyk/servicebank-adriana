# ServiceBank

Prototipo académico de una mesa de servicio tecnológica para registrar, clasificar y gestionar solicitudes e incidentes en un contexto bancario ficticio.

> **Aviso académico:** ServiceBank no es un producto oficial de Banco Itaú. No utiliza información, usuarios, integraciones ni procesos internos reales de la entidad.

## Información académica

- **Estudiante:** Adriana Ramírez Bernal
- **Código:** ____________________
- **Asignatura:** Arquitectura de Software
- **Actividad:** Orquestando Códigos: La Sinfonía de los Sistemas

## Prototipo publicado

[Abrir ServiceBank](https://servicebank-adriana.vercel.app)

## Funcionalidades

- Tablero con solicitudes activas, críticas y resueltas.
- Registro, consulta y búsqueda de solicitudes.
- Clasificación por categoría, impacto y urgencia.
- Cálculo automático de prioridad.
- Detalle, asignación, estados, comentarios e historial.
- Simulación de perfiles: colaborador, agente, técnico y administrador.

## Tecnologías

- Next.js 16.
- React 19.
- TypeScript.
- HTML y CSS.
- Web Storage API (localStorage).
- Vercel.

## Arquitectura

El prototipo utiliza una arquitectura web modular basada en componentes. La interfaz y la lógica de demostración se ejecutan en el navegador.

    Usuario
      └── Interfaz Next.js/React
            ├── Gestión de solicitudes
            ├── Estrategia de prioridad
            ├── Control demostrativo de perfiles
            └── Persistencia local del navegador

La arquitectura objetivo documentada en el informe plantea una evolución hacia un monolito modular por capas, API REST, autenticación y base de datos relacional. Para la demostración publicada se utilizó almacenamiento local, evitando costos e integraciones con sistemas reales.

## Patrones aplicados

- **Strategy:** la prioridad cambia según la combinación de impacto y urgencia.
- **Repository:** el almacenamiento se mantiene separado conceptualmente de las operaciones del dominio y puede sustituirse por una API.
- **Observer orientado a eventos:** cada cambio relevante genera un registro en el historial.
- **Separación de responsabilidades:** presentación, reglas y persistencia son responsabilidades diferentes.

## Ejecución local

### Requisitos

- Node.js 22 o superior.
- npm.

### Instalación

    git clone https://github.com/adryramir3z41-cmyk/servicebank-adriana.git
    cd servicebank
    npm install
    npm run dev

Abrir http://localhost:3000.

### Compilación

    npm run build
    npm start

## Perfiles demostrativos

| Perfil | Crear | Consultar | Comentar | Cambiar estado | Asignar |
|---|---:|---:|---:|---:|---:|
| Colaborador | Sí | Sí | Sí | No | No |
| Agente | Sí | Sí | Sí | Sí | Sí |
| Técnico | Sí | Sí | Sí | Sí | No |
| Administrador | Sí | Sí | Sí | Sí | Sí |

## Pruebas realizadas

Se validaron carga, creación, búsqueda, prioridad, asignación, estado, comentarios, historial, restricciones por perfil y persistencia. El detalle se encuentra en [docs/PRUEBAS.md](docs/PRUEBAS.md).

## Estructura

    servicebank/
    ├── app/
    │   ├── detail.css
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── docs/
    │   └── PRUEBAS.md
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    └── README.md

## Limitaciones

- Los perfiles son simulados y no corresponden a usuarios bancarios reales.
- La información se guarda en el navegador de cada dispositivo.
- Los registros no se comparten entre equipos.
- No existen integraciones con sistemas bancarios, transacciones o datos de clientes.
- El prototipo no debe utilizarse en producción.

## Despliegue

**https://servicebank-adriana.vercel.app**

## Autoría

Proyecto académico elaborado por **Adriana Ramírez Bernal** para la asignatura Arquitectura de Software.
