-- Ambientes e Ideal para, opcionales. Las experiencias existentes quedan con listas vacías.
ALTER TABLE "experiences" ADD COLUMN "environments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "experiences" ADD COLUMN "ideal_for" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
