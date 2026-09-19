import { useApp } from "../../hooks/useApp";
import type { Page } from "../../state/workspace-types";
import { Icon } from "../common/Icon";

const pages: { page: Page; icon: string }[] = [
  { page: "Today", icon: "book" },
  { page: "Supplies", icon: "box" },
  { page: "Record types", icon: "spark" },
  { page: "Settings", icon: "settings" },
];

export function PageNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const { page: current, setPage } = useApp();
  return (
    <nav className="page-navigation" aria-label="Main navigation">
      {pages.map(({ page, icon }) => (
        <button
          type="button"
          key={page}
          className={current === page ? "active" : undefined}
          aria-current={current === page ? "page" : undefined}
          onClick={() => {
            setPage(page);
            onNavigate?.();
          }}
        >
          <Icon name={icon} />
          {page}
        </button>
      ))}
    </nav>
  );
}
