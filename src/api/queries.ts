import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Filters } from "../state/filters";
import { toCompareRequest, toNetworkRequest } from "../state/filters";
import type { EvidenceParams, PeriodId, ProductiveSector } from "./client";
import { explorerApi } from "./client";

const FILTER_DEBOUNCE_MS = 350;

/** Retrasa los cambios de filtros para no disparar una consulta por cada tecla o arrastre. */
export function useDebouncedFilters(filters: Filters): Filters {
  const [debounced, setDebounced] = useState(filters);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(filters), FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [filters]);
  return debounced;
}

export function useMeta(sector: ProductiveSector) {
  return useQuery({
    queryKey: ["explorer", "meta", sector],
    queryFn: ({ signal }) => explorerApi.meta(sector, signal),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useNetwork(filters: Filters, options: { period?: PeriodId; enabled?: boolean } = {}) {
  const request = toNetworkRequest(filters, options.period ?? filters.period);
  return useQuery({
    queryKey: ["explorer", "network", request],
    queryFn: ({ signal }) => explorerApi.network(request, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled: options.enabled ?? true,
  });
}

export function useCompare(filters: Filters, topK: number, enabled = true) {
  const request = toCompareRequest(filters, topK);
  return useQuery({
    queryKey: ["explorer", "compare", request],
    queryFn: ({ signal }) => explorerApi.compare(request, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  });
}

export function useEvidence(params: EvidenceParams | null) {
  return useQuery({
    queryKey: ["explorer", "evidence", params],
    queryFn: ({ signal }) => explorerApi.evidence(params!, signal),
    enabled: params !== null,
    staleTime: 60_000,
  });
}
