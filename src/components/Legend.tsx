import { CATEGORY_ORDER, categoryColor, categoryLabel } from "../domain/vocabulary";
import { useT } from "../i18n";

export function CategoryDot({ category, size = 8 }: { category: string; size?: number }) {
  return <span className="dot" style={{ background: categoryColor(category), width: size, height: size }} />;
}

export function Legend({ categories }: { categories: string[] }) {
  const { t, lang } = useT();
  const ordered = [...categories].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a as never) - CATEGORY_ORDER.indexOf(b as never),
  );
  return (
    <div className="legend" aria-label={t("net.legend")}>
      {ordered.map((code) => (
        <span className="legend-item" key={code} title={categoryLabel(code, lang)}>
          <CategoryDot category={code} />
          {categoryLabel(code, lang, true)}
        </span>
      ))}
    </div>
  );
}
