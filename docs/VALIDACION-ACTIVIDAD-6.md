# Validación de ServiceBank — Actividad 6

**Autora y única integrante:** Adriana Ramirez Bernal.  
**Fecha:** 2 de octubre de 2026.  
**Estado:** versión local implementada y comprobada; publicación pendiente.

## Comprobaciones ejecutadas

La suite `tests/navigation.test.mjs` finalizó con **20 pruebas aprobadas y cero fallos**. La compilación de producción de Next.js con webpack y la comprobación de TypeScript finalizaron correctamente.

Se verificaron códigos existentes e inexistentes con resultados esperados independientes para ambas estrategias, normalización, búsqueda textual, filtros combinados, paginación sin omisiones ni duplicados, desempate por código, páginas fuera de rango, visibilidad, conservación de contexto, creación y cambio de código, actualización de estado, fallo de almacenamiento, duplicados, datos dañados, migración de fechas y conservación de muestras en CSV.

## Recorrido en navegador

Navegador integrado de Codex, motor Chrome 154, Windows. Servidor de producción local: `http://127.0.0.1:3016`.

| Escenario | Resultado observado |
|---|---|
| Código ` sb-demo-001 ` y prioridad Alta | Una coincidencia: SB-DEMO-001. |
| Abrir detalle y cerrar con Escape | Se conservaron código y prioridad; el foco regresó al botón de apertura. |
| Código inexistente | Mensaje de ausencia de coincidencias y paginación deshabilitada. |
| Crear 17 solicitudes sintéticas por formulario | Se conservaron las cuatro originales; total de 21 solicitudes. |
| Página 2 con 21 registros | Un registro; botón Siguiente deshabilitado. |
| Abrir y cerrar detalle desde página 2 | Se recuperó página 2 de 2. |
| Buscar VPN y filtrar estado Resuelto | Se reinició a página 1 y apareció SB-DEMO-003. |
| Cambio a Colaborador | Criterios reiniciados; 18 solicitudes visibles de Usuario Demo 01. |
| Colaborador busca SB-DEMO-003, de otro solicitante | Cero resultados. |
| Recargar aplicación | Se conservaron los 21 registros guardados. |
| Ejecutar evaluación | Finalizó con datos independientes y conservó los datos de la mesa de servicio. |
| Exportar JSON y CSV | Ambos archivos se descargaron y copiaron a `docs/resultados/`. |
| Consola de la versión final | Sin errores ni advertencias capturados. |

Capturas en `docs/evidencias/`: `01-consulta-filtrada.png`, `02-retorno-pagina-2.png` y `03-evaluacion-navegador.png`. La captura de página 2 precede al ajuste visual que hizo visible la autoría en pantallas estrechas; el comportamiento permaneció igual.

## Método de medición

La ejecución final quedó registrada en `benchmark-navegador.json`, con **42 series y 840 muestras de tiempos por operación**. Cada serie incluye 20 repeticiones. El CSV conserva cada muestra y el tamaño de lote utilizado.

Los conjuntos contienen 100, 1.000 y 10.000 registros sintéticos deterministas. Se consulta un código al inicio, en la mitad, al final y uno inexistente. Para consultas preparadas, se ejecutan lotes de 1.000 operaciones secuenciales y 10.000 indexadas, dividiendo la duración por el tamaño del lote. Los tamaños diferentes permiten medir operaciones muy breves, pero introducen diferencias de calentamiento y amortización que limitan la interpretación de razones de velocidad exactas.

Se alterna el orden de las estrategias y se realizan 20 consultas de calentamiento por escenario. Se libera el navegador entre grupos de mediciones. Los valores devueltos se consumen en sumas de control y se comprueba su equivalencia. La preparación incluye construcción de la estrategia y se mide aparte. El servicio por código utiliza lotes de 1.000 y el servicio textual lotes de 10.

La consulta preparada usa directamente el conjunto sintético; el servicio utiliza una instantánea inmutable validada por el repositorio. Los contextos difieren y sus tiempos no deben compararse como operaciones idénticas.

## Resultados representativos del navegador

Medianas en milisegundos por operación, redondeadas desde el JSON original:

| Escenario con 10.000 solicitudes | Secuencial | Indexada |
|---|---:|---:|
| Preparación | No resuelto por el reloj | 0,500000 |
| Código en la mitad, estrategia preparada | 0,026000 | 0,000020 |
| Código al final, estrategia preparada | 0,055800 | 0,000020 |
| Código inexistente, estrategia preparada | 0,046100 | 0,000030 |
| Servicio por código final y visibilidad | 0,233050 | 0,000600 |
| Servicio textual, filtros, orden y página | 3,790000 | 3,680000 |

## Análisis

Las consultas exactas a códigos intermedios, finales e inexistentes tuvieron menor duración mediana con la estrategia indexada preparada. Construir el índice requiere trabajo adicional: su mediana para 10.000 registros fue de 0,5 ms. Su conveniencia depende de cuántas consultas ocurran antes de modificar los datos e invalidarlo.

El escenario textual utiliza el mismo recorrido en ambas configuraciones. Los intervalos P10–P90 se solapan: aproximadamente 3,471–3,949 ms para la secuencial y 3,513–3,926 ms para la indexada. La diferencia de medianas no demuestra una mejora atribuible al índice por código.

La paginación restringe las filas presentadas, pero no elimina el trabajo previo de filtrar y ordenar. Se comprobó su funcionamiento; no se midió separadamente una reducción del renderizado.

Los ceros indican insuficiente resolución temporal. No demuestran operaciones instantáneas ni permiten calcular ventajas mediante divisiones por cero. No se estableció un umbral universal de rendimiento ni una conclusión sobre concurrencia.

## Límites y trabajo posterior

Las mediciones dependen del motor, equipo, carga, calentamiento y distribución de datos. No incluyen red, servidores, memoria consumida, carga JSON inicial, escrituras ni renderizado. Los perfiles son simulados y el almacenamiento no sincroniza cambios concurrentes entre pestañas.

Los diagramas editables se ajustaron al código. El informe PDF de 14 páginas incorpora cuatro vistas vectoriales, evidencia visual, resultados y referencias. Las vistas se dibujaron a partir de los contratos implementados; no se ha comprobado el renderizado de los archivos con un motor PlantUML. La presentación visual de 16 diapositivas y su guion están preparados. El video y la actualización del repositorio y del sitio publicado permanecen pendientes.

La revisión frente a la rúbrica volvió a ejecutar las 20 pruebas y confirmó 0 fallos. Se corrigió el archivo de clases para representar isVisible como función del módulo y los filtros y el orden dentro de query. La validación de los cinco criterios se conserva en un documento complementario.
