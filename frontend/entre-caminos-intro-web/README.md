# Animación de entrada — Entre Caminos

Incluye un componente React listo para Vite y una vista previa en video.

## Integración

1. Copia `EntreCaminosIntro.tsx`, `entre-caminos-intro.css` y `key-icon-green.png` a la carpeta de componentes.
2. Importa el componente en la vista principal:

```tsx
import EntreCaminosIntro from "./components/EntreCaminosIntro";

export default function App() {
  return (
    <>
      <EntreCaminosIntro />
      {/* Resto de la página */}
    </>
  );
}
```

La duración predeterminada es de 2,6 segundos. Puede cambiarse con
`<EntreCaminosIntro duration={3000} />`.

El componente respeta la preferencia de movimiento reducido del dispositivo.
