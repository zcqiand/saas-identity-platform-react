// Sidebar nav with grouped menu items (matches our function-tree M00-M06).
// Pure presentational; receives nav items as prop so it's testable.

import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface NavItem {
  to: string;
  label: string;
  group: string;
  icon?: ReactNode;
  /** data-fn M-ID for L5 alignment */
  fnId?: string;
}

interface SidebarNavProps {
  items: NavItem[];
  title?: string;
  subtitle?: string;
}

export function SidebarNav({ items, title = "SaaS IAM", subtitle = "Multi-tenant" }: SidebarNavProps) {
  // Group items by their group key
  const groups = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <aside className="w-56 shrink-0 bg-slate-900 text-white flex flex-col" data-testid="sidebar-nav">
      <div className="p-4 border-b border-white/10">
        <h1 className="text-base font-bold">{title}</h1>
        <p className="text-xs text-white/60">{subtitle}</p>
      </div>
      <nav className="flex-1 p-2 overflow-y-auto">
        {Object.entries(groups).map(([groupName, groupItems]) => (
          <div key={groupName} className="mb-3">
            <div className="px-3 py-1 text-xs text-white/30 uppercase tracking-wider font-medium">
              {groupName}
            </div>
            {groupItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/" || item.to.endsWith("/dashboard")}
                data-fn={item.fnId}
                className={({ isActive }) =>
                  cn(
                    "block px-3 py-2 rounded text-sm transition-colors",
                    isActive
                      ? "bg-slate-700 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}