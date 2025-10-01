# Medellín Urbano  Pareja 3: Dashboard de Eventos (Listado)

## Objetivo
Mostrar la lista pública de eventos y permitir navegar al detalle.

## Alcance
- Componente de lista que en 
gOnInit consulta EventService.getEvents().
- Render de tarjetas simples por evento (title, date, location) con *ngFor.
- Navegación al detalle /evento/:id.

## Restricciones
- Sin librerías externas. CSS por componente.
- Datos simulados (servicio/observable). No backend real.

## Conceptos clave
- Componentes, Servicios, DI, Ciclo de vida (
gOnInit), @For, ruteo.

## Criterios de aceptación
- La vista /eventos lista eventos con al menos: título, fecha (ISO a legible) y ubicación.
- Cada tarjeta permite navegar a /evento/:id.
- Manejo de estados básicos: cargando, vacío, error simulado.

## Rutas y contratos
- Ruta pública: /eventos.
- Event: { id, title, description, date, location, imageUrl?, creatorId }.
- EventService.getEvents(): Observable<Event[]> (o Promise equivalente).

## Integración
- Navega al detalle de Pareja 5.
- Los eventos se usan también por Pareja 4 (crear/editar) y 7 (por usuario).
