import { api } from "./api";
import type { AdminFaq, ApiResponse, FaqCategory, FaqList, FaqSource, FaqStatus, PublicFaq } from "../types";

export const FAQ_SUBJECT_MIN = 3;
export const FAQ_SUBJECT_MAX = 120;
export const FAQ_QUESTION_MIN = 10;
export const FAQ_QUESTION_MAX = 2000;
export const FAQ_ANSWER_MIN = 10;
export const FAQ_ANSWER_MAX = 4000;

export type AdminFaqQuery = {
  q?: string;
  status?: FaqStatus | "";
  source?: FaqSource | "";
  categoryId?: string;
  sort?: "newest" | "oldest";
  page?: number;
  limit?: number;
};

export async function getPublicFaqs(params: { q?: string; category?: string; page?: number; limit?: number }) {
  const { data } = await api.get<ApiResponse<FaqList<PublicFaq>>>("/faqs", { params });
  return data.data;
}

export async function submitFaq(payload: { question: string }) {
  const { data } = await api.post<
    ApiResponse<{ faq: { id: string; subject: string; status: FaqStatus; notified?: boolean } }>
  >("/faqs", payload);
  return data.data.faq;
}

export async function getAdminFaq(id: string) {
  const { data } = await api.get<ApiResponse<{ faq: AdminFaq }>>(`/admin/faqs/${id}`);
  return data.data.faq;
}

export async function getAdminFaqs(params: AdminFaqQuery) {
  const { data } = await api.get<ApiResponse<FaqList<AdminFaq>>>("/admin/faqs", { params });
  return data.data;
}

export async function createFaqCategory(name: string) {
  const { data } = await api.post<ApiResponse<{ category: FaqCategory }>>("/admin/faqs/categories", { name });
  return data.data.category;
}

export async function createAdminFaq(payload: {
  subject: string;
  question: string;
  answer?: string;
  status: FaqStatus;
  categoryId?: string | null;
}) {
  const { data } = await api.post<ApiResponse<{ faq: AdminFaq }>>("/admin/faqs", payload);
  return data.data.faq;
}

export async function updateAdminFaq(
  id: string,
  payload: {
    subject?: string;
    question?: string;
    answer?: string | null;
    status?: FaqStatus;
    categoryId?: string | null;
  },
) {
  const { data } = await api.put<ApiResponse<{ faq: AdminFaq }>>(`/admin/faqs/${id}`, payload);
  return data.data.faq;
}

export async function answerAdminFaq(
  id: string,
  payload: { answer: string; publish: boolean; categoryId?: string | null },
) {
  const { data } = await api.post<ApiResponse<{ faq: AdminFaq; notified: boolean }>>(`/admin/faqs/${id}/answer`, payload);
  return data.data;
}

export async function getMyFaqAnswer(id: string) {
  const { data } = await api.get<ApiResponse<{ faq: { id: string; question: string; answer: string; answeredAt: string } }>>(
    `/faqs/mine/${id}`,
  );
  return data.data.faq;
}

export async function publishAdminFaq(id: string) {
  const { data } = await api.post<ApiResponse<{ faq: AdminFaq }>>(`/admin/faqs/${id}/publish`);
  return data.data.faq;
}

export async function unpublishAdminFaq(id: string) {
  const { data } = await api.post<ApiResponse<{ faq: AdminFaq }>>(`/admin/faqs/${id}/unpublish`);
  return data.data.faq;
}

export async function hideAdminFaq(id: string) {
  const { data } = await api.post<ApiResponse<{ faq: AdminFaq }>>(`/admin/faqs/${id}/hide`);
  return data.data.faq;
}

export async function discardAdminFaq(id: string) {
  const { data } = await api.post<ApiResponse<{ faq: AdminFaq }>>(`/admin/faqs/${id}/discard`);
  return data.data.faq;
}

export async function deleteAdminFaq(id: string) {
  await api.delete(`/admin/faqs/${id}`);
}
