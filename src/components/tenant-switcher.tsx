"use client";

// M00.F02.I03 / M01.F03.I02 — 租户切换器（2026-09-11 接真 API，E2E REQ-2026-004）
// 成员关系：GET /me/tenants（TenantMember[]，契约无租户名）；
// 显示名：join 平台租户列表（本前端即管理控制台，admin/tenants 是自身页面数据源，复用同一 query key 缓存）。
// 切换：POST /me/tenants/:id/switch → 新 tenant-scoped token 落 session → 进该租户工作区。
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenant } from "@/state/tenant-context";
import { meListMyTenants, meSwitchTenant } from "@/api/endpoints/me/me";
import { adminTenantsListTenants } from "@/api/endpoints/admin-tenants/admin-tenants";
import { toApiError } from "@/api/http-client";
import { toast } from "sonner";

export function TenantSwitcher() {
  const { currentTenantId, setTenant } = useTenant();
  const navigate = useNavigate();

  const membershipsQ = useQuery({
    queryKey: ["meListMyTenants"],
    queryFn: async () => (await meListMyTenants({ clientId: "" })).data,
  });
  const tenantsQ = useQuery({
    queryKey: ["adminTenantsListTenants"],
    queryFn: async () => (await adminTenantsListTenants()).data.items,
  });

  const memberships = membershipsQ.data ?? [];
  const nameById = new Map((tenantsQ.data ?? []).map((t) => [t.id, t.name]));
  const tenantKeyById = new Map((tenantsQ.data ?? []).map((t) => [t.id, t.tenantKey]));

  async function onSwitch(tenantId: string) {
    try {
      const res = await meSwitchTenant(tenantId, { clientId: "" });
      setTenant(tenantId, null, res.data.accessToken);
      navigate(`/tenants/${tenantId}/users`);
    } catch (err) {
      const apiErr = toApiError(err);
      toast.error(
        apiErr.status === 404 ? "该租户不存在或你不是其成员" : `切换失败：${apiErr.message}`,
      );
    }
  }

  const current = memberships.find((m) => m.tenantId === currentTenantId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          data-testid="tenant-switcher"
          data-fn="M00.F02.I03"
        >
          <Building2 className="h-4 w-4 text-slate-500" />
          <span className="font-medium">
            {current ? (nameById.get(current.tenantId) ?? "…") : "选择租户"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>切换租户</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships
          .filter((m) => m.status !== "disabled")
          .map((m) => (
            <DropdownMenuItem
              key={m.id}
              onSelect={() => void onSwitch(m.tenantId)}
              className="cursor-pointer"
            >
              <Building2 className="h-4 w-4 mr-2 text-slate-500" />
              <div className="flex flex-col">
                <span className="font-medium">{nameById.get(m.tenantId) ?? m.tenantId.slice(0, 8)}</span>
                <span className="text-xs text-slate-500 font-mono">
                  {tenantKeyById.get(m.tenantId) ?? ""}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
