# Medellín Urbano  Examen Final (Angular 20)

SPA colaborativa para descubrir, crear y reseñar eventos en Medellín. 7 parejas trabajan en funcionalidades interdependientes pero modularizadas.

## Cómo correr el proyecto

`bash
npm install
npm start
`

- URL por defecto: http://localhost:4200
- No hay backend real; todos los servicios simulan datos

## Estructura esperada (sugerida)

`
src/app/
  core/                 # Guards, interceptors, utilidades core (a crear por parejas)
  auth/                 # Login/Registro (Pareja 1)
    pages/
    services/
  events/               # Listado, detalle, crear/editar, eliminar (Parejas 35)
    pages/
    services/
  profile/              # Perfil (Pareja 7)
    pages/
    services/
  shared/               # Componentes reutilizables (Navbar, tarjetas, etc.)
    components/
    models/             # Modelos actuales (pueden reubicarse según decisión)
`

> Importante: No hemos generado scaffolding de código para dejar el trabajo del examen intacto. Solo existen los modelos base y estas instrucciones.

## Reglas generales
- Angular 20 + TypeScript. CSS por componente.
- Sin librerías externas de UI/estado.
- Token JWT simulado en Local Storage.
- Servicios con datos en arreglos.
- Guards para rutas protegidas.
- Código legible, nombres expresivos, separación de responsabilidades.

## Parejas y alcance resumido (¿a quién preguntar?)

- **Pareja 1  Autenticación (Login/Registro)**: Formularios reactivos, validaciones, AuthService (login/logout/isAuthenticated), token en Local Storage. Rutas públicas /login, /registro.
  - Consultas sobre: estado de autenticación, contrato de AuthService.

- **Pareja 2  Rutas protegidas, Guard y Navbar**: AuthGuard (CanActivate), redirección a /login, rutas protegidas (/crear-evento, /editar-evento/:id, /perfil), Navbar con enlaces condicionales y logout.
  - Consultas sobre: navegación, protección de rutas, visibilidad en Navbar.

- **Pareja 3  Eventos: Listado (Dashboard público)**: EventService.getEvents(), *ngFor de tarjetas, navegación a /evento/:id.
  - Consultas sobre: estructura mínima de tarjeta, estados de carga/vacío.

- **Pareja 4  Eventos: Crear/Editar**: Formulario reactivo único; crear (/crear-evento) y editar (/editar-evento/:id) usando ActivatedRoute y EventService (add/getById/update).
  - Consultas sobre: validaciones, uso de creatorId del usuario autenticado.

- **Pareja 5  Evento: Detalle y Eliminar**: EventService.getEventById, botón eliminar visible solo para creador, redirección a /eventos.
  - Consultas sobre: visibilidad de acciones por autoría, contrato deleteEvent.

- **Pareja 6  Reseñas (anidado en detalle)**: Lista de reseñas del evento, formulario para rating (15) y comentario; ReviewService.addReview(eventId, reseña); comunicación con detalle.
  - Consultas sobre: contrato de ReviewService, comunicación @Input/@Output.

- **Pareja 7  Perfil de Usuario**: UserService.getCurrentUser(), EventService.getEventsByUserId, (opcional) edición de 
ame/email.
  - Consultas sobre: datos del usuario actual, filtrado por userId.

## Rutas sugeridas
- Públicas: /eventos, /evento/:id, /login, /registro (opcional).
- Protegidas: /crear-evento, /editar-evento/:id, /perfil.

## Contratos de datos mínimos
- User { id, name, email, avatarUrl? }
- Event { id, title, description, date (ISO), location, imageUrl?, creatorId }
- Review { id, eventId, authorId, rating (1-5), comment, createdAt (ISO) }
- Credentials { email, password }
- AuthToken { token, userId, issuedAt, expiresAt }

## Comunicación y coordinación
- Acordar contratos entre parejas antes de implementar.
- Mantener un README por pareja en instrucciones/ con decisiones y supuestos.
- Uso recomendado de ramas por pareja y PRs para integración.

## Commit asistido
- Método multiplataforma (Node):
  - `npm run commit:asistido` o alias corto `npm run c:a`.
  - Requiere Node 18+.

Convención de ramas: `pareja-01` … `pareja-07`. Desde `main`, los scripts crearán/seleccionarán automáticamente tu rama.
