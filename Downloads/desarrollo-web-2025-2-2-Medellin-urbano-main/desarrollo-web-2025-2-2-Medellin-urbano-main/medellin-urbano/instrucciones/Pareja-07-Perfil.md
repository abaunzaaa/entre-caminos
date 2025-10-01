# Medellín Urbano  Pareja 7: Perfil de Usuario

## Objetivo
Permitir a usuarios autenticados ver y editar su información y visualizar los eventos que han creado.

## Alcance
- Vista de perfil que carga datos del usuario actual (UserService.getCurrentUser()).
- Listado de eventos creados por el usuario (EventService.getEventsByUserId(userId)).
- (Opcional) Formulario reactivo para editar name y email.

## Restricciones
- Ruta protegida por el Guard (Pareja 2).
- Sin librerías externas. CSS por componente.

## Conceptos clave
- Componentes, Servicios, DI, ngOnInit, @For, Formularios Reactivos.

## Criterios de aceptación
- /perfil muestra nombre y email del usuario actual.
- Lista de eventos creados por el usuario es visible.
- Validaciones básicas y persistencia simulada.

## Rutas y contratos
- Protegida: /perfil.
- UserService.getCurrentUser(): User.
- EventService.getEventsByUserId(userId: string): Event[].

## Integración
- Depende de AuthService para identificar userId.
- Reutiliza eventos de Parejas 3 y 5.
