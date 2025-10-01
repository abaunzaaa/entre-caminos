# Medellín Urbano  Pareja 4: Crear y Editar Eventos

## Objetivo
Permitir a usuarios autenticados crear nuevos eventos y editar existentes usando un único formulario reactivo.

## Alcance
- Formulario reactivo con campos: title, description, date, location, imageUrl.
- Crear: llamar EventService.addEvent() sin id en la ruta.
- Editar: cargar EventService.getEventById(id) y patchValue; al enviar, EventService.updateEvent().

## Restricciones
- Rutas protegidas por el Guard (Pareja 2).
- Validaciones: 
equired, minLength donde aplique.
- Sin librerías externas. CSS por componente.

## Conceptos clave
- Formularios Reactivos, Validaciones, Servicios, DI, ActivatedRoute (params), Ciclo de vida.

## Criterios de aceptación
- /crear-evento muestra formulario vacío y crea evento con creatorId del usuario autenticado.
- /editar-evento/:id precarga datos y actualiza al enviar.
- Mensajes de validación visibles y deshabilitar submit si inválido.
- Redirección a /eventos o detalle al finalizar.

## Rutas y contratos
- Protegidas: /crear-evento, /editar-evento/:id.
- EventService esperado:
  - addEvent(event: Event): Event
  - getEventById(id: string): Event
  - updateEvent(event: Event): Event

## Integración
- Usa AuthService (userId) y Guard (Pareja 2).
- Impacta listado (Pareja 3) y detalle (Pareja 5).
