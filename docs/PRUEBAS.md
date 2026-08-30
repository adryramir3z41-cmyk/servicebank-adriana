# Evidencias de pruebas — ServiceBank

## Alcance

Las pruebas funcionales se ejecutaron sobre la versión pública de ServiceBank en Vercel. Se utilizaron datos ficticios y un navegador independiente.

## Matriz de validación

| ID | Caso | Resultado esperado | Resultado |
|---|---|---|---|
| CP-01 | Abrir el sitio | Mostrar tablero sin errores | Aprobado |
| CP-02 | Crear solicitud | Registrar el caso y confirmar | Aprobado |
| CP-03 | Impacto y urgencia altos | Calcular prioridad crítica | Aprobado |
| CP-04 | Buscar por asunto | Mostrar la coincidencia | Aprobado |
| CP-05 | Abrir detalle | Mostrar todos los datos | Aprobado |
| CP-06 | Asignar técnico | Actualizar responsable e historial | Aprobado |
| CP-07 | Cambiar estado | Actualizar estado e historial | Aprobado |
| CP-08 | Agregar comentario | Conservar comentario y evento | Aprobado |
| CP-09 | Perfil colaborador | Ocultar estado y asignación | Aprobado |
| CP-10 | Perfil técnico | Permitir estado y ocultar asignación | Aprobado |
| CP-11 | Perfil administrador | Permitir estado y asignación | Aprobado |
| CP-12 | Recargar la página | Mantener datos del navegador | Aprobado |

## Resultado

Los doce casos fueron aprobados. No se observaron errores propios de la aplicación ni pantallas de excepción.

## Consideración

La persistencia utiliza localStorage; los datos permanecen en el navegador donde fueron creados, pero no se sincronizan entre dispositivos.
