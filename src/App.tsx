import { type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/app/app-shell";
import { LoginPage } from "./pages/LoginPage";
import { TenantListPage } from "./pages/TenantListPage";
import { UserListPage } from "./pages/UserListPage";
import { RoleListPage } from "./pages/RoleListPage";
import { ApiKeyListPage } from "./pages/ApiKeyListPage";
import { AuditListPage } from "./pages/AuditListPage";
import { AppListPage } from "./pages/AppListPage";
import { MenuTreePage } from "./pages/MenuTreePage";
import { RoleMenuGrantPage } from "./pages/RoleMenuGrantPage";
import { useTenant } from "./state/tenant-context";

/** 路由守卫：未登录（accessToken 缺失）一律重定向 /login */
function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useTenant();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Login: no sidebar */}
      <Route path="/login" element={<LoginPage />} />

      {/* All other pages wrapped by AppShell (sidebar + header + content) */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/tenants" element={<TenantListPage />} />
        <Route path="/tenants/:tenantId/users" element={<UserListPage />} />
        <Route path="/tenants/:tenantId/roles" element={<RoleListPage />} />
        <Route path="/tenants/:tenantId/roles/:roleId/menus" element={<RoleMenuGrantPage />} />
        <Route path="/tenants/:tenantId/api-keys" element={<ApiKeyListPage />} />
        <Route path="/tenants/:tenantId/audit" element={<AuditListPage />} />
        <Route path="/apps" element={<AppListPage />} />
        <Route path="/apps/:appCode/menus" element={<MenuTreePage />} />
        <Route path="*" element={<Navigate to="/tenants" replace />} />
      </Route>
    </Routes>
  );
}