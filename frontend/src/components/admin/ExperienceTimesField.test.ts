import { describe, expect, it } from "vitest";
import { commitClockPart, draftToAvailabilityTime, resolveClockDraft } from "./ExperienceTimesField";

describe("commitClockPart", () => {
  it("completa una hora de un dígito al salir del campo", () => {
    expect(commitClockPart("9", 1, 12)).toBe("09");
    expect(commitClockPart("1", 1, 12)).toBe("01");
  });

  it("conserva las horas de dos dígitos válidas en formato 12 horas", () => {
    for (const hour of ["10", "11", "12", "01", "02"]) {
      expect(commitClockPart(hour, 1, 12)).toBe(hour.padStart(2, "0"));
    }
  });

  it("no reescribe una hora fuera de 1 a 12", () => {
    expect(commitClockPart("13", 1, 12)).toBe("13");
    expect(commitClockPart("20", 1, 12)).toBe("20");
    expect(commitClockPart("23", 1, 12)).toBe("23");
    expect(commitClockPart("24", 1, 12)).toBe("24");
    expect(commitClockPart("00", 1, 12)).toBe("00");
  });

  it("acepta minutos de 00 a 59 y no recorta el segundo dígito", () => {
    expect(commitClockPart("7", 0, 59)).toBe("07");
    expect(commitClockPart("00", 0, 59)).toBe("00");
    expect(commitClockPart("09", 0, 59)).toBe("09");
    expect(commitClockPart("30", 0, 59)).toBe("30");
    expect(commitClockPart("45", 0, 59)).toBe("45");
    expect(commitClockPart("59", 0, 59)).toBe("59");
    expect(commitClockPart("60", 0, 59)).toBe("60");
  });
});

describe("resolveClockDraft", () => {
  it("conserva el segundo dígito si el blur ve solo el primero", () => {
    expect(resolveClockDraft("1", "12")).toBe("12");
    expect(resolveClockDraft("1", "11")).toBe("11");
    expect(resolveClockDraft("1", "10")).toBe("10");
    expect(commitClockPart(resolveClockDraft("1", "12"), 1, 12)).toBe("12");
  });

  it("usa el valor del input cuando ya está completo", () => {
    expect(resolveClockDraft("12", "1")).toBe("12");
    expect(resolveClockDraft("09", "")).toBe("09");
  });
});

describe("draftToAvailabilityTime", () => {
  it("guarda las combinaciones válidas en el formato de 24 horas existente", () => {
    expect(draftToAvailabilityTime("9", "00", "am")).toBe("09:00");
    expect(draftToAvailabilityTime("10", "30", "am")).toBe("10:30");
    expect(draftToAvailabilityTime("11", "45", "pm")).toBe("23:45");
    expect(draftToAvailabilityTime("12", "45", "pm")).toBe("12:45");
    expect(draftToAvailabilityTime("1", "00", "pm")).toBe("13:00");
    expect(draftToAvailabilityTime("12", "00", "am")).toBe("00:00");
  });

  it("rechaza horas y minutos fuera de rango sin convertirlos", () => {
    expect(draftToAvailabilityTime("13", "00", "pm")).toBeNull();
    expect(draftToAvailabilityTime("14", "00", "am")).toBeNull();
    expect(draftToAvailabilityTime("20", "00", "pm")).toBeNull();
    expect(draftToAvailabilityTime("12", "60", "pm")).toBeNull();
    expect(draftToAvailabilityTime("1", "1", "am")).toBe("01:01");
  });
});
