// M09 — 角色 ↔ 菜单授权（按 app 分组的勾选矩阵 + 保存）

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminAppMenusListMenus,
  tenantRoleMenusListRoleMenus,
  tenantRoleMenusSetRoleMenus,
} from "@/api/endpoints/endpoints";
import type { SetRoleMenusRequest } from "@/api/endpoints/endpoints.schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { toApiError } from "@/api/http-client";
import { toast } from "sonner";
import { getTenant, listApps } from "@saas/identity-platform-msw/fixtures";

export function RoleMenuGrantPage() {
  const { tenantId, roleId } = useParams<{ tenantId: string; roleId: string }>();
  const qc = useQueryClient();
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const tenant = tenantId ? getTenant(tenantId) ?? null : null;
  const tenantLabel = tenant ? `${tenant.name}（${tenant.code}）` : "未知租户";

  // 平台所有 app 下的菜单，按 app 分组
  const apps = useMemo(() => listApps(), []);
  const groupsQ = useQuery({
    queryKey: ["roleMenuGrantApps", tenantId, roleId],
    queryFn: async () => {
      const result: Array<{ appCode: string; appName: string; menus: any[] }> = [];
      for (const a of apps) {
        const menus = (await adminAppMenusListMenus(a.id)).data;
        result.push({ appCode: a.code, appName: a.name, menus });
      }
      return result;
    },
    enabled: !!tenantId && !!roleId,
  });

  const grantQ = useQuery({
    queryKey: ["tenantRoleMenusListRoleMenus", tenantId, roleId],
    queryFn: async () => (await tenantRoleMenusListRoleMenus(tenantId!, roleId!)).data,
    enabled: !!tenantId && !!roleId,
  });

  useEffect(() => {
    if (grantQ.data) setGranted(new Set(grantQ.data.menuIds));
  }, [grantQ.data]);

  const saveMut = useMutation({
    mutationFn: (menuIds: string[]) =>
      tenantRoleMenusSetRoleMenus(tenantId!, roleId!, { menuIds } as SetRoleMenusRequest),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantRoleMenusListRoleMenus", tenantId, roleId] });
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
            <Button variant="outline" data-fn="M09.F02.I03" onClick={clearAll}>
              清空
            </Button>
            <Button
              data-fn="M09.F02.I02"
              onClick={() => saveMut.mutate(Array.from(granted))}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending ? "保存中…" : `保存 (${granted.size})`}
            </Button>
          </div>
        }
      />

      {groupsQ.data?.map((g) => (
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
                  <span className="font-medium text-sm">{m.name}</span>
                  <span className="font-mono text-xs text-slate-500">{m.code}</span>
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
    </div>
  );
}