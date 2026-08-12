// AppShell — top bar with breadcrumbs + left sidebar + main content.

import { useLocation, Outlet } from "react-router-dom";
import {
  Building2,
  Users,
  Shield,
  KeyRound,
  ScrollText,
  LogIn,
  AppWindow,
  ChevronRight,
  Home,
} from "lucide-react";
import type { ReactNode } from "react";
import { SidebarNav, type NavItem } from "./sidebar-nav";
import { TenantSwitcher } from "@/components/tenant-switcher";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS: NavItem[] = [
  { to: "/tenants", label: "租户管理", group: "首页", icon: <Building2 className="h-4 w-4" />, fnId: "M00.F01.I01" },
  { to: "/tenants/:tenantId/users", label: "用户管理", group: "身份管理", icon: <Users className="h-4 w-4" />, fnId: "M01.F01.I01" },
  { to: "/tenants/:tenantId/roles", label: "角色管理", group: "身份管理", icon: <Shield className="h-4 w-4" />, fnId: "M02.F01.I01" },
  { to: "/login", label: "登录", group: "认证授权", icon: <LogIn className="h-4 w-4" />, fnId: "M03.F01.I01" },
  { to: "/oauth-apps", label: "OAuth 应用", group: "认证授权", icon: <AppWindow className="h-4 w-4" />, fnId: "M04.F01.I01" },
  { to: "/tenants/:tenantId/api-keys", label: "API Key", group: "平台运营", icon: <KeyRound className="h-4 w-4" />, fnId: "M05.F01.I01" },
  { to: "/tenants/:tenantId/audit", label: "审计日志", group: "平台运营", icon: <ScrollText className="h-4 w-4" />, fnId: "M06.F01.I01" },
];

interface Crumb {
  label: string;
  to: string;
  icon?: ReactNode;
}

function useBreadcrumbs(pathname: string): Crumb[] {
  if (pathname === "/" || pathname === "/tenants") {
    return [{ label: "首页", to: "/tenants", icon: <Home className="h-3.5 w-3.5" /> }];
  }
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [
    { label: "首页", to: "/tenants", icon: <Home className="h-3.5 w-3.5" /> },
  ];
  let path = "";
  for (const seg of segments) {
    path += "/" + seg;
    crumbs.push({ label: seg.length > 12 ? seg.slice(0, 8) + "…" : seg, to: path });
  }
  return crumbs;
}

export function AppShell() {
  const location = useLocation();
  const crumbs = useBreadcrumbs(location.pathname);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <SidebarNav items={NAV_ITEMS} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-1 text-sm">
            {crumbs.map((c, i) => (
              <div key={c.to} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                <span className="flex items-center gap-1.5 text-slate-600">
                  {c.icon}
                  <span className={i === crumbs.length - 1 ? "font-medium text-slate-900" : ""}>
                    {c.label}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-xs">dev</Badge>
            <TenantSwitcher />
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
