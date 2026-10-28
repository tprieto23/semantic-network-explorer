import { useT } from "../i18n";
import { useUiStore } from "../state/ui";

/**
 * Copia la URL actual: los filtros, la vista y la selección viajan en ella, así que el
 * enlace abre exactamente lo que se está viendo. Avisa con un toast.
 */
export function useCopyLink() {
  const { t } = useT();
  const showToast = useUiStore((state) => state.showToast);
  return async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast(t("top.copied"));
    } catch {
      window.prompt(t("top.copyFallback"), window.location.href);
    }
  };
}
