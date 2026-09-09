import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTACT_INBOX_EMAIL, CONTACT_KINDS, CONTACT_SUBJECTS } from "../src/config/constants.js";
import { env } from "../src/config/env.js";
import { api, prisma, uniqueEmail } from "./helpers.js";

const sendContactEmail = vi.fn();

vi.mock("../src/services/email.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/email.service.js")>();
  return {
    ...actual,
    sendContactEmail: (...args: unknown[]) => sendContactEmail(...args),
  };
});

const touristPayload = () => ({
  kind: CONTACT_KINDS.POSIBLE_USUARIO,
  name: "Camila Viajera",
  email: uniqueEmail("turista"),
  message: "Quiero saber cómo reservar una experiencia cerca de Medellín.",
  reason: "Quiero conocer más experiencias",
});

const allyPayload = () => ({
  kind: CONTACT_KINDS.ALIADO,
  name: "Andrés Host",
  email: uniqueEmail("aliado"),
  message: "Tenemos un taller de cerámica y queremos aparecer en la plataforma.",
  company: "Taller Caminante",
  allyType: "Cultural",
});

describe("Contacto público", () => {
  beforeEach(() => {
    sendContactEmail.mockReset();
    sendContactEmail.mockResolvedValue(true);
  });

  it("permite que un posible usuario envíe nombre, correo y comentario", async () => {
    const payload = touristPayload();
    const response = await api().post("/api/contact").send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.kind).toBe(CONTACT_KINDS.POSIBLE_USUARIO);
    expect(sendContactEmail).toHaveBeenCalledTimes(1);

    const mail = sendContactEmail.mock.calls[0][0] as { kind: string; name: string; email: string; message: string };
    expect(mail.kind).toBe(CONTACT_KINDS.POSIBLE_USUARIO);
    expect(mail.name).toBe(payload.name);
    expect(mail.email).toBe(payload.email);
    expect(mail.message).toBe(payload.message);
  });

  it("permite que un aliado envíe nombre, correo y comentario", async () => {
    const payload = allyPayload();
    const response = await api().post("/api/contact").send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data.kind).toBe(CONTACT_KINDS.ALIADO);

    const mail = sendContactEmail.mock.calls[0][0] as {
      kind: string;
      name: string;
      email: string;
      message: string;
      company: string;
    };
    expect(mail.kind).toBe(CONTACT_KINDS.ALIADO);
    expect(mail.name).toBe(payload.name);
    expect(mail.email).toBe(payload.email);
    expect(mail.message).toBe(payload.message);
    expect(mail.company).toBe(payload.company);
  });

  it("conserva el tipo de contacto y lo guarda en persistencia", async () => {
    const tourist = await api().post("/api/contact").send(touristPayload());
    const ally = await api().post("/api/contact").send(allyPayload());

    expect(tourist.body.data.kind).toBe(CONTACT_KINDS.POSIBLE_USUARIO);
    expect(ally.body.data.kind).toBe(CONTACT_KINDS.ALIADO);

    const storedTourist = await prisma.contact.findUnique({ where: { id: tourist.body.data.id } });
    const storedAlly = await prisma.contact.findUnique({ where: { id: ally.body.data.id } });

    expect(storedTourist?.type).toBe(CONTACT_KINDS.POSIBLE_USUARIO);
    expect(storedTourist?.message).toContain("Quiero conocer más experiencias");
    expect(storedTourist?.message).toContain("Quiero saber cómo reservar");
    expect(storedAlly?.type).toBe(CONTACT_KINDS.ALIADO);
    expect(storedAlly?.message).toContain("Taller Caminante");
    expect(storedAlly?.message).toContain("taller de cerámica");
  });

  it("envía siempre al correo oficial de Entre Caminos", async () => {
    const { buildContactMail } = await import("../src/services/email.service.js");
    const createdAt = new Date("2026-09-09T14:00:00.000Z");
    const tourist = buildContactMail({
      kind: CONTACT_KINDS.POSIBLE_USUARIO,
      name: "Camila Viajera",
      email: "camila@entrecaminos.test",
      message: "Hola",
      reason: "Otro",
      createdAt,
    });
    const ally = buildContactMail({
      kind: CONTACT_KINDS.ALIADO,
      name: "Andrés Host",
      email: "andres@entrecaminos.test",
      message: "Propuesta",
      company: "Taller Caminante",
      allyType: "Cultural",
      createdAt,
    });

    expect(env.CONTACT_TO_EMAIL).toBe(CONTACT_INBOX_EMAIL);
    expect(tourist.to).toBe(CONTACT_INBOX_EMAIL);
    expect(ally.to).toBe(CONTACT_INBOX_EMAIL);
    expect(tourist.subject).toBe(CONTACT_SUBJECTS.POSIBLE_USUARIO);
    expect(ally.subject).toBe(CONTACT_SUBJECTS.ALIADO);
    expect(tourist.to).not.toBe(tourist.replyTo);
    expect(ally.to).not.toBe(ally.replyTo);
    expect(tourist.html).toContain("Posible usuario");
    expect(ally.html).toContain("Aliado");
    const escaped = buildContactMail({
      kind: CONTACT_KINDS.POSIBLE_USUARIO,
      name: "<script>alert(1)</script>",
      email: "camila@entrecaminos.test",
      message: "Hola & listo",
      reason: "Otro",
      createdAt,
    });
    expect(escaped.html).toContain("&lt;script&gt;");
    expect(escaped.html).not.toContain("<script>alert");
    expect(escaped.html).toContain("Hola &amp; listo");
  });

  it("rechaza un comentario vacío o compuesto solo por espacios", async () => {
    const empty = await api().post("/api/contact").send({ ...touristPayload(), message: "" });
    const blank = await api().post("/api/contact").send({ ...touristPayload(), message: "   " });

    expect(empty.status).toBe(422);
    expect(blank.status).toBe(422);
    expect(await prisma.contact.count()).toBe(0);
  });

  it("rechaza un correo inválido", async () => {
    const response = await api()
      .post("/api/contact")
      .send({ ...touristPayload(), email: "no-es-un-correo" });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body)).toMatch(/correo/i);
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("rechaza un tipo de contacto no permitido", async () => {
    const response = await api()
      .post("/api/contact")
      .send({ ...touristPayload(), kind: "HACKER" });

    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body)).toMatch(/tipo de contacto no permitido/i);
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("devuelve un error controlado si el servicio de correo falla", async () => {
    sendContactEmail.mockResolvedValue(false);
    const payload = touristPayload();
    const response = await api().post("/api/contact").send(payload);

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("EMAIL_UNAVAILABLE");
    expect(response.body.error.message).toBe("No pudimos enviar tu mensaje. Inténtalo de nuevo.");
    expect(JSON.stringify(response.body)).not.toMatch(/sendgrid|api[_-]?key|Bearer/i);
  });
});
