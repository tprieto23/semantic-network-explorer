import { lazy, Suspense } from "react";
import { useMeta, useDebouncedFilters, useNetwork } from "./api/queries";
import { DetailsPanel } from "./components/DetailsPanel";
import { EntityTable } from "./components/EntityTable";
import { FilterPanel } from "./components/FilterPanel";
import { NetworkView } from "./components/NetworkView";
import { filterIssues, useFilterStore } from "./state/filters";
import type { Tab } from "./state/selection";
import { useSelectionStore } from "./state/selection";

// ECharts solo se descarga al abrir la pestaña de evolución.
const EvolutionView = lazy(() => import("./components/EvolutionView"));

const TABS: { id: Tab; label: string }[] = [
  { id: "network", label: "Red" },
  { id: "evolution", label: "Evolución" },
  { id: "table", label: "Entidades" },
];

export default function App() {
  const filters = useFilterStore((state) => state.filters);
  const stableFilters = useDebouncedFilters(filters);
  const tab = useSelectionStore((state) => state.tab);
  const setTab = useSelectionStore((state) => state.setTab);

  const meta = useMeta(stableFilters.sector);
  const availableCategories = meta.data?.categories.filter((category) => !category.legacy).length ?? 10;
  const issues = filterIssues(stableFilters, availableCategories);
  const network = useNetwork(stableFilters, { enabled: issues.length === 0 });

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Explorador de redes semánticas</h1>
          <span className="subtitle">Coocurrencia de entidades por oración · corpus de las incubadoras</span>
        </div>
        <nav className="tabs" role="tablist" aria-label="Vistas">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <span className="header-spacer" />
        {meta.error instanceof Error && <span className="notice error">{meta.error.message}</span>}
      </header>

      <FilterPanel meta={meta.data} network={network.data} />

      <main className="main">
        {tab === "network" && (
          <NetworkView network={network.data} isFetching={network.isFetching} error={network.error} issues={issues} />
        )}
        {tab === "evolution" && issues.length === 0 && (
          <Suspense fallback={<div className="empty">Cargando vista de evolución…</div>}>
            <EvolutionView filters={stableFilters} />
          </Suspense>
        )}
        {tab === "evolution" && issues.length > 0 && (
          <div className="evolution">
            {issues.map((issue) => (
              <div className="notice error" key={issue}>
                {issue}
              </div>
            ))}
          </div>
        )}
        {tab === "table" && <EntityTable network={network.data} metric={stableFilters.metric} />}
      </main>

      <DetailsPanel network={network.data} filters={stableFilters} />
    </div>
  );
}
