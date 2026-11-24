# Correo automático de documentos

«Evidencias de Correo» fue retirado del menú UDI. El backend implementa copias
automáticas con adjuntos privados, destinatarios desde `usuarios.correo_electronico`
y reintentos independientes del trámite. Falta completar la contraseña de
aplicación de Gmail y actualizar los correos de prueba antes de activar envíos.

El registro inicial envía a Decanatura un solo correo con solicitud y proyecto.
El tesista es el emisor funcional. La cuenta SMTP es infraestructura y puede
recibir avisos técnicos de rebote. En ese paso no se copia al tesista ni al asesor.
Las reglas de los pasos siguientes se revisarán conforme avance el flujo.

La activación y responsabilidades de Desler están en `docs/CORREO_AUTOMATICO.md`
del repositorio SISET-FCE-BACK.

## Interfaces de Desler

- Mantener las operaciones actuales. Los modelos compartidos registran las copias.
- No agregar un módulo de evidencias, botón ni petición adicional de envío.
- El éxito del trámite no confirma que llegó el correo.
- Un fallo de correo no debe provocar que el usuario repita el trámite.
- Integrar ambos repositorios, aplicar la migración donde falte, configurar SMTP
  y mantener activo el programador del backend.

## Git consultado el 13 de noviembre de 2026

Se ejecutó `git fetch origin` en ambos repositorios. HEAD coincidía con
`origin/main`; no había commits de main pendientes de integrar. La rama local
`feature/tesista-udi-continuacion` no tiene upstream configurado.

Hay trabajo local acumulado sin publicar en ambos repositorios. Falta revisar,
crear commits y publicar las ramas para que Desler pueda descargarlas.
No se hizo commit, push ni cambios en main durante esta entrega.
