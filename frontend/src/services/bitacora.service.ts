import { api } from "./api";
import type { BitacoraAsset, BitacoraBundle, PageDoc } from "../components/bitacora/types";

type ApiResponse<T> = { success: boolean; data: T };

export async function loadBitacora() {
  const { data } = await api.get<ApiResponse<BitacoraBundle>>("/bitacora");
  return data.data;
}

export async function saveBitacora(pages: PageDoc[]) {
  const { data } = await api.put<ApiResponse<BitacoraBundle>>("/bitacora", { pages });
  return data.data;
}

export async function uploadBitacoraPhoto(file: File) {
  const body = new FormData();
  body.append("image", file);
  const { data } = await api.post<ApiResponse<{ asset: BitacoraAsset }>>("/bitacora/assets", body);
  return data.data.asset;
}

export async function deleteBitacoraAsset(assetId: string) {
  await api.delete(`/bitacora/assets/${assetId}`);
}
