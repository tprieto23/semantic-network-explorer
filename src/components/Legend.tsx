import { CATEGORY_ORDER, categoryColor, categoryLabel } from "../domain/vocabulary";
import type { Community } from "../domain/communities";
import { formatInt } from "../domain/vocabulary";
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
        <span className="legend-item" key={code} data-tip={categoryLabel(code, lang)}>
          <CategoryDot category={code} />
          {categoryLabel(code, lang, true)}
        </span>
      ))}
    </div>
  );
}

/** Grupos más grandes, nombrados por su entidad más importante. */
export function CommunityLegend({ communities, max = 6 }: { communities: Community[]; max?: number }) {
  const { t, lang } = useT();
  const shown = communities.filter((community) => community.size > 1).slice(0, max);
  return (
    <div className="legend" aria-label={t("net.communityLegend")}>
      {shown.map((community) => (
        <span
          className="legend-item"
          key={community.index}
          data-tip={t("net.communityTip", { name: community.leader.name, n: formatInt(community.size, lang) })}
        >
          <span className="dot" style={{ background: community.color, width: 8, height: 8 }} />
          {community.leader.name}
          <span className="faint num">{community.size}</span>
        </span>
      ))}
    </div>
  );
}
