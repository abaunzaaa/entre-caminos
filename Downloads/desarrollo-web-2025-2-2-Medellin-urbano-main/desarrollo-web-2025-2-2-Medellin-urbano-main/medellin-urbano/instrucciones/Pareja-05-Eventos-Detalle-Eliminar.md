# Medellín Urbano  Pareja 5: Detalle de Evento y Eliminación

## Objetivo
Mostrar información completa de un evento y permitir su eliminación cuando el usuario sea el creador.

## Alcance
- Cargar EventService.getEventById(id) usando ActivatedRoute.
- Mostrar datos completos del evento.
- Botón  Eliminar visible solo si creatorId === currentUserId.

## Restricciones
- Sin librerías externas. CSS por componente.
- El detalle puede ser público; la acción de eliminar es solo para el creador autenticado.

## Conceptos clave
- Componentes, Rutas con parámetros, Servicios, @If, Comunicación con componentes hijos (opcional para reseñas).

## Criterios de aceptación
- /evento/:id muestra el detalle.
- Si el usuario autenticado es el creador, se muestra botón Eliminar que llama EventService.deleteEvent(id).
- Tras eliminar, redirige a /eventos.

## Rutas y contratos
- Ruta: /evento/:id (pública o protegida según acuerdo de la clase).
- EventService.deleteEvent(id: string): void.

## Integración
- Depende de AuthService (userId) para verificar autoría.
- Contiene/coordina con reseñas de Pareja 6.
