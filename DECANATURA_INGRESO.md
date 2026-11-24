# Integración del ingreso por Decanatura

El registro del tesista conserva los códigos existentes:

- Etapa: `registro_expediente_digital`.
- Estado: `pendiente_derivacion`.

Esta combinación pertenece a la bandeja inicial de Decanatura. UDI no puede
consultarla ni realizar la primera derivación.

## Integración para Desler

1. Consultar `GET /api/expedientes?etapa=registro_expediente_digital&estado=pendiente_derivacion`
   con la sesión de Decanatura.
2. Mostrar la solicitud y el proyecto con los endpoints de consulta existentes.
3. Al aprobar el primer filtro, llamar a
   `POST /api/expedientes/{id}/derivacion-udi`, sin cuerpo.
4. Actualizar la bandeja después del éxito.

El POST requiere rol `decanatura` (también se conserva el acceso administrativo).
Devuelve `id_expediente`, `etapa_actual` y `estado_actual`.
La etapa sigue siendo `registro_expediente_digital` y el estado pasa a
`derivado_udi`. Registra el actor en el historial con la acción
`expediente_derivado_udi_por_decanatura`.
Un rol no autorizado recibe 403 y una segunda derivación recibe 409.

La ruta anterior `/revision-documentaria/recepcion` conserva compatibilidad,
pero aplica los mismos permisos de Decanatura. UDI ya no muestra ese botón;
inicia la revisión desde `derivado_udi`.

El retorno existente de UDI se mantiene:
`POST /api/expedientes/{id}/revision-documentaria/derivacion-decanatura`.
Conserva las validaciones de conformidad, Turnitin y propuesta de jurados, y
termina en `aprobacion_designacion_jurados` / `derivado_decanatura`.

## Catálogos y datos existentes

`etapas_expediente` describe la fase; `estados_expediente` describe la situación
dentro de esa fase. Se usan ambas claves de Expedientes, sin agregar catálogos
ni migraciones. `derivado_decanatura` sigue reservado para el retorno de UDI.

Los expedientes que aún estén pendientes pasan a la bandeja inicial de
Decanatura por la nueva regla de consulta. Los que ya fueron derivados o
revisados conservan su situación; no se reescribe su historial.

La interfaz de Decanatura queda a cargo de Desler.
