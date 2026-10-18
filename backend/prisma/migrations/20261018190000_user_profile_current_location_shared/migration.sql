-- La ubicación del perfil (departamento y municipio) sigue en sus columnas.
-- Este indicador solo marca las coordenadas que la persona compartió de forma explícita.

ALTER TABLE "user_profiles"
  ADD COLUMN "current_location_shared" BOOLEAN NOT NULL DEFAULT false;
