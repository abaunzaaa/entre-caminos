# Piezas de avatar

El configurador actual reconstruye el avatar con SVG local en `frontend/src/components/onboarding/AvatarPreview.tsx`.

No hay assets 3D profesionales en el repositorio. Cuando existan, colócalos aquí con este contrato:

```
frontend/src/assets/avatars/
  skin/{sand,honey,amber,cocoa,espresso}.png
  face/{soft,oval,round}.png
  hair/{short,wavy,bun,fade,none}/
    {ink,chestnut,gold,silver,dark}.png
  outfit/{shirt,knit,jacket}/
    {forest,sage,sand,clay}.png
  accessory/{none,earring}.png
  glasses/{none,round,thin}.png
```

Formato: PNG o WebP cuadrado, fondo transparente, 512×512, recorte centrado al busto.

La configuración persistida en PostgreSQL sigue siendo:

```ts
{
  version: 1,
  skinTone, face, hairStyle, hairColor,
  outfit, outfitColor, accessory?, glasses?
}
```

El preview debe seguir usando exactamente esos identificadores para reconstruir el avatar en cualquier sesión.
