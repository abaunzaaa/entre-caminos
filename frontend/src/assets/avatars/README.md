# Piezas 3D del avatar

No hay un paquete 3D en el repositorio. El configurador ya persiste un JSON v2 y busca capas en esta carpeta. Hasta que existan los PNG, la vista previa usa un compositor de reserva y **no debe considerarse el avatar 3D final**.

## Contrato

```
frontend/src/assets/avatars/v2/
  skin/{sand,honey,amber,cocoa,espresso}.png
  face/{soft,oval,round}.png
  eyes/{almond,round,lidded}.png
  eyebrows/{soft,defined,arched}.png
  mouths/{neutral,soft-smile,calm}.png
  hair/{short,wavy,bun,fade}/{ink,chestnut,gold,silver,dark}.png
  outfit/{shirt,knit,jacket}/{forest,sage,sand,clay}.png
  glasses/{round,thin}.png
  accessory/earring.png
```

- PNG o WebP, 1024×1024, fondo transparente, busto 3/4, iluminación de estudio.
- Proporciones adultas, expresión neutra, sin contorno negro.
- Ropa en verdes, beige y tierra.
- Todas las capas deben compartir la misma cámara y origen.

Cuando `AVATAR_ASSET_MANIFEST.ready` pase a `true` y existan esos archivos, `AvatarPreview` los combina en el mismo orden del manifiesto. El JSON guardado en `user_profiles.avatar_config` no cambia de identificadores.
