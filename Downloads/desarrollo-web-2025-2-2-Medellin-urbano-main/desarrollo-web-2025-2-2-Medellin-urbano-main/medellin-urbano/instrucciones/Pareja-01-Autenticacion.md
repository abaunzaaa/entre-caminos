# Medellín Urbano  Pareja 1: Autenticación (Login y Registro)

## Objetivo
Habilitar el acceso de usuarios al sistema mediante login y registro, gestionando un token (JWT falso) en Local Storage.

## Alcance
- Implementar formulario de Login con Formularios Reactivos.
- Registro con estructura similar a Login.
- Servicio de autenticación con métodos: login(credentials), logout(), isAuthenticated().
- Persistencia del token falso en Local Storage tras login.

## Restricciones
- Angular 20 + TypeScript. CSS por componente.
- Sin librerías externas de UI o estado global.
- Token simulado; no hay backend real. Simular respuestas async (Promises/Observables).
- No modificar archivos de otras parejas salvo contratos acordados.

## Conceptos clave
- Componentes, Formularios Reactivos, Validaciones, Servicios, Inyección de Dependencias, Local Storage, Ruteo básico.

## Criterios de aceptación
- Formulario de Login con validaciones: email (required, email) y password (required, minLength).
- AuthService.login guarda un token con 	oken, userId, issuedAt, expiresAt en Local Storage.
- isAuthenticated() retorna 	rue/false según existencia y vigencia del token.
- Rutas esperadas (públicas): /login, /registro (si se implementa).
- Feedback visual de validaciones (touched/invalid) y de error de credenciales simuladas.

## Rutas y contratos
- Rutas públicas: /login, /registro.
- Datos esperados:
  - Credentials: { email: string; password: string; }
  - AuthToken: { token: string; userId: string; issuedAt: string; expiresAt: string; }

## Integración
- Consumida por el Guard de la Pareja 2 (isAuthenticated).
- Navbar (Pareja 2) muestra/oculta opciones según autenticación.
