import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { TenantListPage } from "./pages/TenantListPage";
import { UserListPage } from "./pages/UserListPage";
import { RoleListPage } from "./pages/RoleListPage";
import { OAuthAppListPage } from "./pages/OAuthAppListPage";
import { ApiKeyListPage } from "./pages/ApiKeyListPage";
import { AuditListPage } from "./pages/AuditListPage";
import { TenantSwitcher } from "./components/tenant-switcher";
import { useTenant } from "./state/tenant-context";

function Protected({ children }: { children: React.ReactNode }) {
  const { accessToken } = useTenant();
  if (!accessToken) return <Navigate to="/login" replace />;
  return (
    <>
      <TenantSwitcher />
      {children}
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/tenants"
        element={
          <Protected>
            <TenantListPage />
          </Protected>
        }
      />
      <Route
        path="/tenants/:tenantId/users"
        element={
          <Protected>
            <UserListPage />
          </Protected>
        }
      />
      <Route
        path="/tenants/:tenantId/roles"
        element={
          <Protected>
            <RoleListPage />
          </Protected>
        }
      />
      <Route
        path="/oauth-apps"
        element={
          <Protected>
            <OAuthAppListPage />
          </Protected>
        }
      />
      <Route
        path="/tenants/:tenantId/api-keys"
        element={
          <Protected>
            <ApiKeyListPage />
          </Protected>
        }
      />
      <Route
        path="/tenants/:tenantId/audit"
        element={
          <Protected>
            <AuditListPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/tenants" replace />} />
    </Routes>
  );
}
