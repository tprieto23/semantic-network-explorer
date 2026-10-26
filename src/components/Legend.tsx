import type { CategoryCode } from "../api/client";
import { CATEGORY_FALLBACK_LABELS, categoryColor } from "../domain/vocabulary";

export function Legend({ categories }: { categories: string[] }) {
  return (
    <div className="legend" aria-label="Leyenda de categorías">
      {categories.map((code) => (
        <span className="legend-item" key={code}>
          <span className="dot" style={{ background: categoryColor(code) }} />
          {CATEGORY_FALLBACK_LABELS[code as CategoryCode] ?? code}
        </span>
      ))}
    </div>
  );
}

export function EntityRef({ name, category }: { name: string; category: string }) {
  return (
    <span className="entity-ref">
      <span className="dot" style={{ background: categoryColor(category) }} />
      {name}
    </span>
  );
}
