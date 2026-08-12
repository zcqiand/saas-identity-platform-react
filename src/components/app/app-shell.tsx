// AppShell — top header + left sidebar + main content.
// All pages are wrapped by this shell; routing happens inside <Outlet />.

import { Outlet } from "react-router-dom";
import { SidebarNav, type NavItem } from "./sidebar-nav";
import { TenantSwitcher } from "@/components/tenant-switcher";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS: NavItem[] = [
  // 首页 — TenantSwitcher 入口（M00.F02）
  { to: "/tenants", label: "租户管理", group: "首页", fnId: "M00.F01.I01" },

  // 身份管理 — M01/M02
  { to: "/tenants/:tenantId/users", label: "用户管理", group: "身份管理", fnId: "M01.F01.I01" },
  { to: "/tenants/:tenantId/roles", label: "角色管理", group: "身份管理", fnId: "M02.F01.I01" },

  // 认证授权 — M03/M04
  { to: "/login", label: "登录", group: "认证授权", fnId: "M03.F01.I01" },
  { to: "/oauth-apps", label: "OAuth 应用", group: "认证授权", fnId: "M04.F01.I01" },

  // 平台运营 — M05/M06
  { to: "/tenants/:tenantId/api-keys", label: "API Key", group: "平台运营", fnId: "M05.F01.I01" },
  { to: "/tenants/:tenantId/audit", label: "审计日志", group: "平台运营", fnId: "M06.F01.I01" },
];

export function AppShell() {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <SidebarNav items={NAV_ITEMS} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b flex items-center px-6 shrink-0">
          <TenantSwitcher />
        </header>
        <Separator />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}