// M00.F04 — 角色 ↔ 菜单授权（按 client 分组的勾选矩阵 + 保存）
// 2026-09-11 E2E REQ-2026-005：barrel 死桩切真源（client-menus/admin-clients/
// tenant-role-menus tag）+ 契约字段对齐（AdminClient.clientId/clientName、SysMenu.title/path）。

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientMenusListSysMenus } from "@/api/endpoints/client-menus/client-menus";
import { useAdminClientsListClients } from "@/api/endpoints/admin-clients/admin-clients";
import {
  tenantRoleMenusListSysRoleMenus,
  tenantRoleMenusSetSysRoleMenus,
} from "@/api/endpoints/tenant-role-menus/tenant-role-menus";
import { useAdminTenantsGetTenant } from "@/api/endpoints/admin-tenants/admin-tenants";
import type { SysMenu } from "@/api/endpoints/model";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { toApiError } from "@/api/http-client";
import { toast } from "sonner";

export function RoleMenuGrantPage() {
  const { tenantId, roleId } = useParams<{ tenantId: string; roleId: string }>();
  const qc = useQueryClient();
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const tenantQ = useAdminTenantsGetTenant(tenantId!, { query: { enabled: !!tenantId } });
  const tenant = tenantQ.data?.data ?? null;
  const tenantLabel = tenant ? `${tenant.name}（${tenant.tenantKey}）` : "未知租户";

  // 平台所有 client 下的菜单，按 client 分组（每张 Card 独立 menus，勿共享）
  const appsQ = useAdminClientsListClients();
  const apps = appsQ.data?.data?.items ?? [];
  const groupsQ = useQuery({
    // app 寻址统一 code 形（clientId）：真后端按 client_id 列查，行 UUID 会 404
    queryKey: ["roleMenuGrantAllGroups", tenantId, roleId, apps.map((a) => a.clientId).join(",")],
    queryFn: async () => {
      const items = apps;
      return Promise.all(
        items.map(async (a) => ({
          appCode: a.clientId,
          appName: a.clientName,
          menus: (await clientMenusListSysMenus(a.clientId)).data,
        })),
      );
    },
    enabled: !!tenantId && !!roleId && apps.length > 0,
  });

  const grantQ = useQuery({
    queryKey: ["tenantRoleMenusListSysRoleMenus", tenantId, roleId],
    queryFn: async () =>
      (await tenantRoleMenusListSysRoleMenus(tenantId!, roleId!, { clientId: "" })).data,
    enabled: !!tenantId && !!roleId,
  });

  useEffect(() => {
    if (grantQ.data) setGranted(new Set(grantQ.data.menuIds));
  }, [grantQ.data]);

  const saveMut = useMutation({
    mutationFn: (menuIds: string[]) =>
      tenantRoleMenusSetSysRoleMenus(tenantId!, roleId!, { menuIds }, { clientId: "" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantRoleMenusListSysRoleMenus", tenantId, roleId] });
      toast.success("菜单授权已保存");
    },
    onError: (err) => toast.error(`保存失败：${toApiError(err).message}`),
  });

  function toggle(id: string) {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearAll() {
    setGranted(new Set());
  }

  const groups: Array<{ appCode: string; appName: string; menus: SysMenu[] }> = groupsQ.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="角色菜单授权"
        description={
          <span>
            租户 <span className="font-semibold text-slate-700">{tenantLabel}</span> / 角色{" "}
            <span className="font-mono text-xs">{roleId ?? "—"}</span>
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" data-fn="M00.F04.I04" onClick={clearAll}>
              清空
            </Button>
            <Button
              data-fn="M00.F04.I03"
              onClick={() => saveMut.mutate(Array.from(granted))}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending ? "保存中…" : `保存 (${granted.size})`}
            </Button>
          </div>
        }
      />

      {groupsQ.isPending || grantQ.isPending ? (
        <PageLoading />
      ) : (
        <>
          {groups.map((g) => (
            <Card key={g.appCode}>
              <CardHeader>
                <CardTitle>
                  {g.appName}{" "}
                  <span className="ml-2 text-xs font-mono text-slate-500">({g.appCode})</span>
                  <span className="ml-2 text-xs font-mono text-slate-500">{g.menus.length} 项</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {g.menus.map((m) => {
                  const checked = granted.has(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-50 cursor-pointer"
                      data-testid="menu-grant-row"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(m.id)}
                        className="h-4 w-4"
                      />
                      <span className="font-medium text-sm">{m.title}</span>
                      <span className="font-mono text-xs text-slate-500">{m.path}</span>
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-slate-600">当前授权摘要</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                共勾选 <span className="font-bold">{granted.size}</span> 项菜单
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
