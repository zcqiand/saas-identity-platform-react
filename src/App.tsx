import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/app/app-shell";
import { LoginPage } from "./pages/LoginPage";
import { TenantListPage } from "./pages/TenantListPage";
import { UserListPage } from "./pages/UserListPage";
import { RoleListPage } from "./pages/RoleListPage";
import { OAuthAppListPage } from "./pages/OAuthAppListPage";
import { ApiKeyListPage } from "./pages/ApiKeyListPage";
import { AuditListPage } from "./pages/AuditListPage";

export default function App() {
  return (
    <Routes>
      {/* Login: no sidebar */}
      <Route path="/login" element={<LoginPage />} />

      {/* All other pages wrapped by AppShell (sidebar + header + content) */}
      <Route element={<AppShell />}>
        <Route path="/tenants" element={<TenantListPage />} />
        <Route path="/tenants/:tenantId/users" element={<UserListPage />} />
        <Route path="/tenants/:tenantId/roles" element={<RoleListPage />} />
        <Route path="/oauth-apps" element={<OAuthAppListPage />} />
        <Route path="/tenants/:tenantId/api-keys" element={<ApiKeyListPage />} />
        <Route path="/tenants/:tenantId/audit" element={<AuditListPage />} />
        <Route path="*" element={<Navigate to="/tenants" replace />} />
      </Route>
    </Routes>
  );
}