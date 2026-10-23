import { api } from "./api";
import type { BitacoraAsset, BitacoraBundle, PageDoc } from "../components/bitacora/types";

type ApiResponse<T> = { success: boolean; data: T };

const FRESH_MS = 45_000;
let cached: { bundle: BitacoraBundle; at: number } | null = null;
let inflight: Promise<BitacoraBundle> | null = null;

function remember(bundle: BitacoraBundle) {
  cached = { bundle, at: Date.now() };
  return bundle;
}

export function peekBitacora() {
  if (!cached || Date.now() - cached.at > FRESH_MS) {
    return null;
  }
  return cached.bundle;
}

function requestBitacora() {
  if (!inflight) {
    inflight = api
      .get<ApiResponse<BitacoraBundle>>("/bitacora")
      .then((response) => remember(response.data.data))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function prefetchBitacora() {
  if (peekBitacora()) {
    return;
  }
  void requestBitacora().catch(() => undefined);
}

export async function loadBitacora(options?: { fresh?: boolean }) {
  if (options?.fresh) {
    cached = null;
  } else {
    const hit = peekBitacora();
    if (hit) {
      return hit;
    }
  }
  return requestBitacora();
}

export async function saveBitacora(pages: PageDoc[]) {
  const { data } = await api.put<ApiResponse<BitacoraBundle>>("/bitacora", { pages });
  return remember(data.data);
}

export async function uploadBitacoraPhoto(file: File) {
  const body = new FormData();
  body.append("image", file);
  const { data } = await api.post<ApiResponse<{ asset: BitacoraAsset }>>("/bitacora/assets", body);
  cached = null;
  return data.data.asset;
}

export async function deleteBitacoraAsset(assetId: string) {
  await api.delete(`/bitacora/assets/${assetId}`);
  cached = null;
}
