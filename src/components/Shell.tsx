import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ExplorerMeta, NetworkResponse } from "../api/client";
import { PERIOD_ORDER, categoryLabel, formatInt, metricLabel, periodShort } from "../domain/vocabulary";
import type { Lang, MessageKey } from "../i18n";
import { useLangStore, useT } from "../i18n";
import { useFilterStore } from "../state/filters";
import type { Tab } from "../state/selection";
import { useSelectionStore } from "../state/selection";
import { useThemeStore } from "../state/theme";
import { EvolutionIcon, LogoIcon, MoreIcon, NetworkIcon, SearchIcon, SummaryIcon, TableIcon, ThemeIcon } from "./icons";
import { CategoryDot } from "./Legend";
import { periodDocumentCount } from "../domain/scope";

const VIEWS: { id: Tab; label: MessageKey; title: MessageKey; icon: ReactNode }[] = [
  { id: "summary", label: "nav.summary", title: "nav.summary", icon: <SummaryIcon /> },
  { id: "network", label: "nav.network", title: "nav.networkTitle", icon: <NetworkIcon /> },
  { id: "evolution", label: "nav.evolution", title: "nav.evolution", icon: <EvolutionIcon /> },
  { id: "table", label: "nav.table", title: "nav.table", icon: <TableIcon /> },
];

export function NavRail() {
  const { t } = useT();
  const tab = useSelectionStore((state) => state.tab);
  const setTab = useSelectionStore((state) => state.setTab);
  return (
    <nav className="rail" aria-label={t("nav.views")}>
      <span className="rail-logo" data-tip={t("app.title")}>
        <LogoIcon />
      </span>
      {VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          className="rail-btn"
          aria-label={t(view.label)}
          aria-current={tab === view.id ? "page" : undefined}
          onClick={() => setTab(view.id)}
        >
          {view.icon}
          <span className="tip" role="tooltip">
            {t(view.label)}
          </span>
        </button>
      ))}
    </nav>
  );
}

/** Navegación inferior en celular; en pantallas mayores se usa el riel lateral. */
export function BottomTabs() {
  const { t } = useT();
  const tab = useSelectionStore((state) => state.tab);
  const setTab = useSelectionStore((state) => state.setTab);
  return (
    <nav className="tabbar" aria-label={t("nav.views")}>
      {VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          className="tabbar-btn"
          aria-current={tab === view.id ? "page" : undefined}
          onClick={() => setTab(view.id)}
        >
          <span className="tabbar-ico">{view.icon}</span>
          {t(view.label)}
        </button>
      ))}
    </nav>
  );
}

interface TopBarProps {
  meta: ExplorerMeta | undefined;
  network: NetworkResponse | undefined;
}

const LANGS: Lang[] = ["es", "en"];

export function TopBar({ meta, network }: TopBarProps) {
  const { t, lang } = useT();
  const toggleLang = useLangStore((state) => state.toggle);
  const tab = useSelectionStore((state) => state.tab);
  const filters = useFilterStore((state) => state.filters);
  const update = useFilterStore((state) => state.update);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggle);
  const [helpOpen, setHelpOpen] = useState(false);
  // En celular y tablet: el buscador se despliega desde un ícono e idioma, tema y ayuda van en «⋯».
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const view = VIEWS.find((item) => item.id === tab) ?? VIEWS[0];

  useEffect(() => {
    if (!menuOpen && !helpOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setHelpOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, helpOpen]);

  const documentCount = periodDocumentCount(meta, filters, filters.period);

  const langSwitch = (
    <div className="pill-group lang-group" role="group" aria-label={t("top.language")}>
      {LANGS.map((item) => (
        <button
          key={item}
          type="button"
          lang={item}
          aria-pressed={lang === item}
          onClick={() => lang !== item && toggleLang()}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <header className={`topbar${searchOpen ? " search-open" : ""}`}>
      <span className="topbar-logo" aria-hidden>
        <LogoIcon />
      </span>
      <div className="topbar-title">
        <h1>{t(view.title)}</h1>
        <p className="num">
          {documentCount !== undefined ? t("common.documents", { n: formatInt(documentCount, lang) }) : t("common.loading")}
          {network &&
            t("top.counts", {
              nodes: formatInt(network.stages.shown.nodes, lang),
              edges: formatInt(network.stages.shown.edges, lang),
              metric: metricLabel(filters.metric, lang),
            })}
        </p>
      </div>

      <SearchBox network={network} open={searchOpen} onClose={() => setSearchOpen(false)} />
      <button
        type="button"
        className="icon-btn search-toggle"
        aria-label={t("search.open")}
        aria-expanded={searchOpen}
        onClick={() => setSearchOpen(true)}
      >
        <SearchIcon />
      </button>

      <div className="pill-group periods" role="group" aria-label={t("top.period")}>
        {PERIOD_ORDER.map((period) => {
          const count = periodDocumentCount(meta, filters, period);
          return (
            <button
              key={period}
              type="button"
              aria-pressed={filters.period === period}
              disabled={count === 0}
              data-tip={
                count === 0
                  ? t("top.periodEmpty")
                  : count !== undefined
                    ? t("common.documents", { n: formatInt(count, lang) })
                    : undefined
              }
              onClick={() => update({ period })}
            >
              {periodShort(period, lang)}
            </button>
          );
        })}
      </div>

      <div className="wide-only">{langSwitch}</div>

      <button
        type="button"
        className="icon-btn wide-only"
        aria-label={t("top.help")}
        aria-expanded={helpOpen}
        onClick={() => setHelpOpen(!helpOpen)}
        style={{ fontSize: 15, fontWeight: 600 }}
      >
        ?
      </button>

      <button type="button" className="icon-btn wide-only" aria-label={t("top.theme")} onClick={toggleTheme}>
        <ThemeIcon />
      </button>

      <div className="more-wrap">
        <button
          type="button"
          className="icon-btn"
          aria-label={t("top.more")}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <MoreIcon />
        </button>
        {menuOpen && (
          <>
            <div className="menu-backdrop" aria-hidden onClick={() => setMenuOpen(false)} />
            <div className="menu" role="menu" aria-label={t("top.more")}>
              <div className="menu-row">
                <span>{t("top.language")}</span>
                {langSwitch}
              </div>
              <button type="button" className="menu-row menu-item" role="menuitem" onClick={toggleTheme}>
                <span>{t("top.themeLabel")}</span>
                <span className="menu-value">
                  <ThemeIcon />
                  {theme === "oscuro" ? t("top.dark") : t("top.light")}
                </span>
              </button>
              <button
                type="button"
                className="menu-row menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setHelpOpen(true);
                }}
              >
                <span>
                  <span className="menu-help" aria-hidden>
                    ?
                  </span>
                  {t("top.help")}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {helpOpen && (
        <div className="popover help-pop" role="dialog" aria-label={t("top.help")}>
          <h3>{t("top.help")}</h3>
          <ul>
            {(["top.help1", "top.help2", "top.help3", "top.help4", "top.help5"] as const).map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <button type="button" className="text-btn" style={{ marginTop: 10 }} onClick={() => setHelpOpen(false)}>
            {t("top.gotIt")}
          </button>
        </div>
      )}
    </header>
  );
}

interface SearchBoxProps {
  network: NetworkResponse | undefined;
  /** Desplegado desde el ícono (celular): recibe el foco al abrirse. */
  open: boolean;
  onClose: () => void;
}

function SearchBox({ network, open: expanded, onClose }: SearchBoxProps) {
  const { t, lang } = useT();
  const metric = useFilterStore((state) => state.filters.metric);
  const select = useSelectionStore((state) => state.select);
  const setTab = useSelectionStore((state) => state.setTab);
  const tab = useSelectionStore((state) => state.tab);
  const requestFocus = useSelectionStore((state) => state.requestFocus);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) input.current?.focus();
  }, [expanded]);

  // «/» enfoca el buscador desde cualquier parte, salvo mientras se escribe en otro campo.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      if (event.key === "/" && !typing) {
        event.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || !network) return [];
    return network.nodes
      .filter((node) => node.name.toLowerCase().includes(term))
      .sort((a, b) => a.ranks[metric] - b.ranks[metric])
      .slice(0, 8);
  }, [query, network, metric]);

  function choose(id: string) {
    select({ kind: "node", id });
    if (tab !== "table") setTab("network");
    requestFocus(id);
    setQuery("");
    setOpen(false);
    input.current?.blur();
    onClose();
  }

  return (
    <div className="search" role="search">
      <input
        ref={input}
        type="search"
        placeholder={t("search.placeholder")}
        aria-label={t("search.placeholder")}
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((value) => Math.min(value + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((value) => Math.max(value - 1, 0));
          } else if (event.key === "Enter" && results[active]) {
            choose(results[active].id);
          } else if (event.key === "Escape") {
            setOpen(false);
            input.current?.blur();
            onClose();
          }
        }}
      />
      <span className="kbd" aria-hidden>
        /
      </span>
      <button type="button" className="search-close" aria-label={t("search.close")} onClick={onClose}>
        ×
      </button>
      <button
        type="button"
        className="search-go"
        aria-label={t("search.button")}
        onClick={() => (results[active] ? choose(results[active].id) : input.current?.focus())}
      >
        <SearchIcon />
      </button>
      {open && results.length > 0 && (
        <ul className="search-results" role="listbox">
          {results.map((node, index) => (
            <li key={node.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(node.id)}
              >
                <CategoryDot category={node.category} />
                {node.name}
                <span className="faint">
                  {categoryLabel(node.category, lang, true)} · #{node.ranks[metric]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && results.length === 0 && network && (
        <ul className="search-results">
          <li className="faint" style={{ padding: "7px 10px" }}>
            {t("search.noMatch")}
          </li>
        </ul>
      )}
    </div>
  );
}
