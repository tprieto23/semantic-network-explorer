import { useEffect } from "react";
import { useCompare, useDebouncedFilters, useMeta, useNetwork } from "./api/queries";
import { DetailsPanel } from "./components/DetailsPanel";
import { EntityTable } from "./components/EntityTable";
import EvolutionView from "./components/EvolutionView";
import { FilterPanel } from "./components/FilterPanel";
import { NetworkView } from "./components/NetworkView";
import { BottomTabs, NavRail, TopBar } from "./components/Shell";
import { SummaryView } from "./components/SummaryView";
import { TooltipLayer } from "./components/TooltipLayer";
import { errorText, useT } from "./i18n";
import { filterIssues, useFilterStore } from "./state/filters";
import { useSelectionStore } from "./state/selection";
import { useTheme } from "./state/theme";

/** Entidades seguidas entre períodos para detectar subidas y bajadas en el resumen. */
const INSIGHT_TOP_K = 50;

export default function App() {
  const theme = useTheme();
  const { t, lang } = useT();
  const filters = useFilterStore((state) => state.filters);
  const stableFilters = useDebouncedFilters(filters);
  const tab = useSelectionStore((state) => state.tab);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // La barra del navegador móvil toma el color de fondo del tema.
    const color = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t("app.title");
  }, [lang, t]);

  const meta = useMeta(stableFilters.sector);
  const availableCategories = meta.data?.categories.filter((category) => !category.legacy).length ?? 10;
  const issues = filterIssues(stableFilters, availableCategories);
  const network = useNetwork(stableFilters, { enabled: issues.length === 0 });
  // Comparar exige al menos dos períodos con documentos.
  const hasPeriods = (meta.data?.periods ?? []).filter((period) => period.document_count > 0).length >= 2;
  const compare = useCompare(stableFilters, INSIGHT_TOP_K, issues.length === 0 && hasPeriods);

  return (
    <div className="rs">
      <NavRail />
      <div className="workspace">
        <TopBar meta={meta.data} network={network.data} />
        {meta.error instanceof Error && !meta.data && <div className="notice error">{errorText(meta.error, t)}</div>}
        <div className="content">
          {tab === "summary" && (
            <SummaryView
              network={network.data}
              compare={compare.data}
              meta={meta.data}
              filters={stableFilters}
              isFetching={network.isFetching}
            />
          )}
          {tab === "network" && (
            <>
              <FilterPanel meta={meta.data} network={network.data} />
              <NetworkView
                network={network.data}
                compare={compare.data}
                isFetching={network.isFetching}
                error={network.error}
                issues={issues}
                onRetry={() => void network.refetch()}
              />
            </>
          )}
          {tab === "evolution" && <EvolutionView filters={stableFilters} meta={meta.data} />}
          {tab === "table" && <EntityTable network={network.data} metric={stableFilters.metric} />}
          {tab !== "summary" && <DetailsPanel network={network.data} filters={stableFilters} />}
        </div>
      </div>
      <BottomTabs />
      <TooltipLayer />
    </div>
  );
}
