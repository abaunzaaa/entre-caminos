# Medellín Urbano  Pareja 6: Reseñas (CRUD anidado)

## Objetivo
Permitir a usuarios autenticados crear reseñas (rating + comment) dentro de la página de detalle del evento.

## Alcance
- Componente(s) para listar reseñas y formulario reactivo para crear una reseña.
- Solo visible el formulario si el usuario está autenticado.
- Al enviar, agregar reseña y actualizar la lista.

## Restricciones
- Sin librerías externas. CSS por componente.
- Datos simulados; reseñas asociadas por eventId y authorId (usuario actual).

## Conceptos clave
- Componentes hijos, @Input/@Output o servicio compartido, Formularios Reactivos, Validaciones, @For, @If.

## Criterios de aceptación
- Lista de reseñas visible en el detalle del evento, ordenadas por createdAt (desc).
- Formulario con rating (5) y comment (required, minLength) visible solo autenticado.
- ReviewService.addReview(eventId, review) agrega y refleja en la UI.

## Rutas y contratos
- Vive dentro de /evento/:id.
- Review: { id, eventId, authorId, rating, comment, createdAt }.
- ReviewService esperado:
  - getByEventId(eventId: string): Review[]
  - addReview(eventId: string, review: Omit<Review,'id'|'createdAt'|'eventId'|'authorId'>): Review

## Integración
- Se renderiza en el detalle (Pareja 5). Usa AuthService para authorId.
