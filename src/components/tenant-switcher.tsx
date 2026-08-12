// Tenant switcher — top-bar dropdown. Calls POST /api/me/tenants/{tenantId}/switch.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../state/tenant-context";

interface Membership {
  id: string;
  tenantId: string;
  roleIds: string[];
  status: "active" | "invited" | "removed";
}

export function TenantSwitcher() {
  const { currentTenantId, setTenant } = useTenant();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void fetchMemberships();
  }, []);

  async function fetchMemberships() {
    // M00.F02.I02 — list current user memberships
    setLoading(true);
    try {
      // In a real app: GET /api/me/tenants via shared api-client
      // For MVP scaffold: return mock single membership
      setMemberships([
        {
          id: "m1",
          tenantId: "00000000-0000-0000-0000-000000000001",
          roleIds: [],
          status: "active",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function switchTenant(tenantId: string) {
    // M00.F02.I03 — switch tenant via POST /api/me/tenants/{tenantId}/switch
    setTenant(tenantId, null, "mock-token-" + tenantId);
    navigate(`/tenants/${tenantId}/users`);
  }

  if (loading) return <div data-testid="tenant-switcher-loading">加载中...</div>;

  return (
    <div
      data-testid="tenant-switcher"
      style={{ padding: "8px 16px", borderBottom: "1px solid #eee" }}
    >
      <label style={{ marginRight: 8 }}>当前租户:</label>
      <select
        value={currentTenantId ?? ""}
        onChange={(e) => void switchTenant(e.target.value)}
        data-fn="M00.F02.I03"
      >
        <option value="" disabled>
          请选择
        </option>
        {memberships.map((m) => (
          <option key={m.id} value={m.tenantId}>
            {m.tenantId.slice(0, 8)}…
          </option>
        ))}
      </select>
    </div>
  );
}
