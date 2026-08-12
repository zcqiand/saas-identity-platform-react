// Sidebar nav with grouped menu items + lucide icons (matches M00-M06).

import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

export interface NavItem {
  to: string;
  label: string;
  group: string;
  icon: ReactNode;
  /** data-fn M-ID for L5 alignment */
  fnId?: string;
}

interface SidebarNavProps {
  items: NavItem[];
  title?: string;
  subtitle?: string;
  /** Action rendered at the bottom of the sidebar (e.g. logout button) */
  footerAction?: ReactNode;
  /** Version text rendered below the footer action */
  version?: string;
}

export function SidebarNav({
  items,
  title = "SaaS IAM",
  subtitle = "Multi-tenant",
  footerAction,
  version = "v0.1.0 · Multi-tenant",
}: SidebarNavProps) {
  const groups = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});
  const orderedGroups = Object.keys(groups);

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-white flex flex-col" data-testid="sidebar-nav">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
            S
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold leading-tight truncate">{title}</h1>
            <p className="text-xs text-white/50 truncate">{subtitle}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {orderedGroups.map((groupName) => {
          const groupItems = groups[groupName];
          return (
            <div key={groupName} className="mb-4">
              <div className="px-3 mb-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                {groupName}
              </div>
              <div className="space-y-0.5">
                {groupItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/" || item.to.endsWith("/dashboard")}
                    data-fn={item.fnId}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors",
                        isActive
                          ? "bg-slate-700 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white",
                      )
                    }
                  >
                    <span className="h-4 w-4 shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      <Separator className="bg-white/10" />
      <div className="p-3 space-y-2">
        {footerAction}
        {version && <div className="text-xs text-white/40 px-2">{version}</div>}
      </div>
    </aside>
  );
}
