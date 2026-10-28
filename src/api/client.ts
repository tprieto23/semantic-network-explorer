import type { components } from "./schema";

type Schemas = components["schemas"];

export type ExplorerMeta = Schemas["ExplorerMetaResponse"];
export type ExplorerCategory = Schemas["ExplorerCategory"];
export type ExplorerPeriod = Schemas["ExplorerPeriod"];
export type ExplorerDocument = Schemas["ExplorerDocument"];
export type ExplorerDocumentType = Schemas["ExplorerDocumentType"];
export type NetworkRequest = Schemas["ExplorerNetworkRequest"];
export type NetworkResponse = Schemas["ExplorerNetworkResponse"];
export type ExplorerNode = Schemas["ExplorerNode"];
export type ExplorerEdge = Schemas["ExplorerEdge"];
export type ExplorerStages = Schemas["ExplorerStages"];
export type CompareRequest = Schemas["ExplorerCompareRequest"];
export type CompareResponse = Schemas["ExplorerCompareResponse"];
export type EvidenceResponse = Schemas["ExplorerEvidenceResponse"];

export type CategoryCode = NonNullable<NetworkRequest["categories"]>[number];
export type LinkMode = NetworkRequest["link_mode"];
export type EdgeWeighting = NetworkRequest["edge_weighting"];
export type RankingMetric = NetworkRequest["ranking_metric"];
export type PeriodId = NetworkRequest["period"];

export type ProductiveSector = NonNullable<NetworkRequest["productive_sector"]>;

export interface EvidenceParams {
  sector: ProductiveSector;
  sourceId: string;
  targetId: string;
  period: PeriodId;
  incubatorNumber: number | "all";
  language: string;
  documentType: string;
  documentTypeMode: "only" | "exclude";
  documentIds: string[];
  limit?: number;
}

const API_ROOT = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
const EXPLORER_BASE = `${API_ROOT}/analysis/explorer/v1`;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit & { signal?: AbortSignal }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${EXPLORER_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, `No se pudo conectar con la API${API_ROOT ? ` en ${API_ROOT}` : ""}`);
  }
  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") message = body.detail;
      else if (Array.isArray(body?.detail)) message = body.detail.map((item: { msg?: string }) => item.msg).join("; ");
    } catch {
      // Respuesta sin JSON: se conserva el código HTTP.
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export const explorerApi = {
  meta: (sector: ProductiveSector, signal?: AbortSignal) =>
    request<ExplorerMeta>(`/meta?productive_sector=${encodeURIComponent(sector)}`, { signal }),

  network: (body: NetworkRequest, signal?: AbortSignal) =>
    request<NetworkResponse>("/network", { method: "POST", body: JSON.stringify(body), signal }),

  compare: (body: CompareRequest, signal?: AbortSignal) =>
    request<CompareResponse>("/compare", { method: "POST", body: JSON.stringify(body), signal }),

  evidence: (params: EvidenceParams, signal?: AbortSignal) => {
    const search = new URLSearchParams({
      source_id: params.sourceId,
      target_id: params.targetId,
      period: params.period,
      incubator_number: String(params.incubatorNumber),
      language: params.language,
      productive_sector: params.sector,
      limit: String(params.limit ?? 50),
    });
    if (params.documentType !== "all") {
      search.set("document_type", params.documentType);
      search.set("document_type_mode", params.documentTypeMode);
    }
    params.documentIds.forEach((id) => search.append("document_ids", id));
    return request<EvidenceResponse>(`/evidence?${search.toString()}`, { signal });
  },
};
