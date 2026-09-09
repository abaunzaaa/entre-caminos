import { api } from "./api";
import type { ApiResponse } from "../types";

export type ContactKind = "POSIBLE_USUARIO" | "ALIADO";

export type ContactPayload = {
  kind: ContactKind;
  name: string;
  email: string;
  message: string;
  reason?: string;
  company?: string;
  allyType?: string;
};

export async function sendContact(payload: ContactPayload) {
  const { data } = await api.post<ApiResponse<{ id: string; kind: ContactKind; createdAt: string }>>(
    "/contact",
    payload,
  );
  return data;
}
