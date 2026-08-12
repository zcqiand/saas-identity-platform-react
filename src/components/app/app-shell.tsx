// AppShell — top bar with breadcrumbs + left sidebar + main content.

import { useLocation, Outlet, Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  Shield,
  KeyRound,
  ScrollText,
  AppWindow,
  LogOut,
  ChevronRight,
  Home,
} from "lucide-react";
import type { ReactNode } from "react";
import { SidebarNav, type NavItem } from "./sidebar-nav";
import { TenantSwitcher } from "@/components/tenant-switcher";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTenant } from "@saas/identity-platform-msw";
import { useTenant } from "@/state/tenant-context";

// M00-M06 + M03 的「登录」从菜单移除（登录页只能直链访问）
const NAV_ITEMS: NavItem[] = [
  { to: "/tenants", label: "租户管理", group: "首页", icon: <Building2 className="h-4 w-4" />, fnId: "M00.F01.I01" },
  { to: "/tenants/:tenantId/users", label: "用户管理", group: "身份管理", icon: <Users className="h-4 w-4" />, fnId: "M01.F01.I01" },
  { to: "/tenants/:tenantId/roles", label: "角色管理", group: "身份管理", icon: <Shield className="h-4 w-4" />, fnId: "M02.F01.I01" },
  { to: "/oauth-apps", label: "OAuth 应用", group: "认证授权", icon: <AppWindow className="h-4 w-4" />, fnId: "M04.F01.I01" },
  { to: "/tenants/:tenantId/api-keys", label: "API Key", group: "平台运营", icon: <KeyRound className="h-4 w-4" />, fnId: "M05.F01.I01" },
  { to: "/tenants/:tenantId/audit", label: "审计日志", group: "平台运营", icon: <ScrollText className="h-4 w-4" />, fnId: "M06.F01.I01" },
];

interface Crumb {
  label: string;
  to: string;
  icon?: ReactNode;
  hint?: string;
}

const SUB_PATH_LABEL: Record<string, string> = {
  users: "用户",
  roles: "角色",
  "api-keys": "API Key",
  audit: "审计日志",
};

function useBreadcrumbs(pathname: string): Crumb[] {
  if (pathname === "/tenants" || pathname === "/") {
    return [{ label: "首页", to: "/tenants", icon: <Home className="h-3.5 w-3.5" /> }];
  }
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [
    { label: "首页", to: "/tenants", icon: <Home className="h-3.5 w-3.5" /> },
  ];
  let path = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    path += "/" + seg;
    const prev = i > 0 ? segments[i - 1] : null;
    if (seg === "tenants" && i + 1 < segments.length) continue;
    if (prev === "tenants") {
      const tenant = getTenant(seg);
      if (tenant) {
        crumbs.push({ label: tenant.name, to: path, hint: tenant.code });
      } else {
        crumbs.push({ label: "未知租户", to: path, hint: seg.slice(0, 8) });
      }
      continue;
    }
    crumbs.push({ label: SUB_PATH_LABEL[seg] ?? seg, to: path });
  }
  return crumbs;
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const crumbs = useBreadcrumbs(location.pathname);
  const { currentTenantId, clear } = useTenant();

  function onLogout() {
    clear();
    navigate("/login");
  }

  const footerAction = (
    <Button
      variant="ghost"
      size="sm"
      onClick={onLogout}
      className="w-full justify-start gap-2 text-white/70 hover:text-white hover:bg-white/10"
      data-testid="logout-btn"
      data-fn="M03.F03.I05"
    >
      <LogOut className="h-4 w-4" />
      登出
    </Button>
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <SidebarNav items={NAV_ITEMS} footerAction={footerAction} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <nav className="flex items-center gap-1 text-sm" aria-label="breadcrumb">
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <div key={c.to} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                  {isLast ? (
                    <span className="flex items-center gap-1.5 text-slate-900 font-medium">
                      {c.icon}
                      {c.label}
                      {c.hint && <span className="text-slate-400 font-mono text-xs">({c.hint})</span>}
                    </span>
                  ) : (
                    <Link
                      to={c.to}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      {c.icon}
                      {c.label}
                      {c.hint && <span className="text-slate-400 font-mono text-xs">({c.hint})</span>}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-xs">dev</Badge>
            {currentTenantId && <TenantSwitcher />}
          </div>
        </header>
        <Separator />
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
