# Medellín Urbano  Pareja 2: Rutas protegidas, Guard y Navbar

## Objetivo
Asegurar navegación segura mediante un Guard y una barra de navegación que refleje el estado de autenticación.

## Alcance
- Implementar AuthGuard con CanActivate que redirija a /login si no hay sesión.
- Crear Navbar que muestre enlaces condicionalmente.
- Proteger rutas que requieren autenticación.

## Restricciones
- Usar AuthService.isAuthenticated() de la Pareja 1.
- Ruteo declarativo. Sin hacks de navegación.
- Sin librerías externas. CSS por componente.

## Conceptos clave
- Router (Routes, routerLink/navegación), Guards (CanActivate), DI, directivas estructurales @If.

## Criterios de aceptación
- Guard funcional aplicado a: /crear-evento, /editar-evento/:id, /perfil.
- Redirección a /login cuando no autenticado.
- Navbar visible en layout principal con enlaces:
  - Siempre: Eventos.
  - Si autenticado: Crear Evento, Perfil, Cerrar sesión.
  - Si NO autenticado: Login.
- El botón  Cerrar sesión llama a logout() y redirige a /login.

## Rutas y contratos
- Rutas públicas: /eventos, /login, /registro, /evento/:id.
- Rutas protegidas: /crear-evento, /editar-evento/:id, /perfil.

## Integración
- Depende de Pareja 1 (AuthService).
- Afecta navegación hacia componentes de Parejas 3 y 7.
