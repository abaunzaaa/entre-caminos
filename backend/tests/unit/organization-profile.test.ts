import { describe, expect, it } from "vitest";
import {
  getOrganizationProfileCompleteness,
  toPublicOrganizationProfile,
} from "../../src/services/organization-profile.service.js";
import { organizationProfileUpsertSchema } from "../../src/validators/organization-profile.validator.js";

describe("OrganizationProfile — completitud y payload público", () => {
  it("permite perfil incompleto y lista campos faltantes", () => {
    const result = getOrganizationProfileCompleteness({
      tradeName: "Finca El Sendero",
      description: null,
      contactPhone: null,
      website: null,
      department: "Antioquia",
      city: "",
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual([
      "Descripción de la empresa",
      "Teléfono público de contacto o sitio web / canal oficial de atención",
      "Municipio",
    ]);
  });

  it("marca completo solo con los campos obligatorios", () => {
    const result = getOrganizationProfileCompleteness({
      tradeName: "Finca El Sendero",
      description: "Experiencias rurales en el oriente antioqueño.",
      contactPhone: "3001234567",
      department: "Antioquia",
      city: "El Retiro",
      contactEmail: null,
      website: null,
    });
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("permite enviar experiencias con canal web oficial y sin teléfono", () => {
    const result = getOrganizationProfileCompleteness({
      tradeName: "Candlelight",
      description: "Conciertos a la luz de las velas.",
      contactPhone: null,
      website: "https://feverup.com/es/medellin/candlelight",
      department: "Antioquia",
      city: "Medellín",
    });
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("sigue bloqueando perfiles sin teléfono y sin canal oficial de contacto", () => {
    const result = getOrganizationProfileCompleteness({
      tradeName: "Candlelight",
      description: "Conciertos a la luz de las velas.",
      contactPhone: null,
      website: null,
      department: "Antioquia",
      city: "Medellín",
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual([
      "Teléfono público de contacto o sitio web / canal oficial de atención",
    ]);
  });

  it("el payload público omite datos privados y solo expone contactos públicos", () => {
    const profile = {
      id: "op-1",
      userId: "admin-1",
      tradeName: "Finca El Sendero",
      legalName: "Finca El Sendero SAS",
      description: "Experiencias rurales.",
      logoUrl: "https://res.cloudinary.com/demo/logo.png",
      logoPublicId: null,
      contactPhone: "3001234567",
      contactEmail: "contacto@finca.test",
      website: "https://finca.test",
      department: "Antioquia",
      city: "El Retiro",
      address: "Vereda X",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const publicProfile = toPublicOrganizationProfile(profile);
    expect(publicProfile).toEqual({
      tradeName: "Finca El Sendero",
      description: "Experiencias rurales.",
      logoUrl: "https://res.cloudinary.com/demo/logo.png",
      department: "Antioquia",
      city: "El Retiro",
      contactPhone: "3001234567",
      contactEmail: "contacto@finca.test",
      website: "https://finca.test",
      address: "Vereda X",
    });
    expect(publicProfile).not.toHaveProperty("userId");
    expect(publicProfile).not.toHaveProperty("legalName");
  });

  it("no expone perfil público incompleto", () => {
    expect(
      toPublicOrganizationProfile({
        id: "op-2",
        userId: "admin-2",
        tradeName: "Incompleto",
        legalName: null,
        description: null,
        logoUrl: null,
        logoPublicId: null,
        contactPhone: null,
        contactEmail: "login@finca.test",
        website: null,
        department: null,
        city: null,
        address: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toBeNull();
  });

  it("acepta guardado parcial en el validador", () => {
    const partial = organizationProfileUpsertSchema.safeParse({
      tradeName: "Café de la Cuenca",
      description: "",
    });
    expect(partial.success).toBe(true);
    if (partial.success) {
      expect(partial.data.tradeName).toBe("Café de la Cuenca");
      expect(partial.data.description).toBeNull();
    }
  });

  it("rechaza teléfono y correo público inválidos", () => {
    expect(
      organizationProfileUpsertSchema.safeParse({
        contactPhone: "123",
      }).success,
    ).toBe(false);
    expect(
      organizationProfileUpsertSchema.safeParse({
        contactEmail: "no-es-correo",
      }).success,
    ).toBe(false);
  });
});
