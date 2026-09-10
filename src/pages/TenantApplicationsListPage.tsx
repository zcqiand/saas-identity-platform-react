// M00.F05 — 租户应用订阅列表（subscribe / update / remove）

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  tenantApplicationsListTenantApplications,
  tenantApplicationsRemoveTenantApplication,
  tenantApplicationsSubscribeTenantApplication,
  tenantApplicationsUpdateTenantApplication,
  useAdminTenantsGetTenant,
} from "@/api/endpoints/endpoints";
import type {
  SubscribeTenantApplicationRequest,
  TenantApplication,
  UpdateTenantApplicationRequest,
} from "@/api/endpoints/endpoints.schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { EmptyState } from "@/components/app/empty-state";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CrudDialog, type FieldDef } from "@/components/app/crud-dialog";
import { toApiError } from "@/api/http-client";
import { toast } from "sonner";

/** M00.F05 状态码（家族约定 2026-09-10）：0=待激活 / 1=启用 / 2=停用 */
const STATUS_OPTIONS = [
  { value: "0", label: "待激活" },
  { value: "1", label: "启用" },
  { value: "2", label: "停用" },
];

function statusToLabel(s: number): string {
  return STATUS_OPTIONS.find((o) => o.value === String(s))?.label ?? `状态 ${s}`;
}

function formatExpireTime(expireTime?: string): string {
  if (!expireTime) return "永久";
  return expireTime.slice(0, 10);
}

const SUBSCRIBE_FIELDS: FieldDef[] = [
  { name: "clientId", label: "Client ID", required: true, placeholder: "lab-management" },
  { name: "expireTime", label: "到期时间", placeholder: "2027-01-01T00:00:00Z（留空=永久）" },
];

const UPDATE_FIELDS: FieldDef[] = [
  {
    name: "status",
    label: "状态",
    type: "select",
    required: true,
    defaultValue: "1",
    options: STATUS_OPTIONS,
  },
  { name: "expireTime", label: "到期时间", placeholder: "留空=永久" },
];

export function TenantApplicationsListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const qc = useQueryClient();
  const tenantQ = useAdminTenantsGetTenant(tenantId!, { query: { enabled: !!tenantId } });
  const tenant = tenantQ.data?.data ?? null;
  const tenantLabel = tenant ? `租户 ${tenant.name}（${tenant.code}）` : "租户未知";

  const list = useQuery<TenantApplication[]>({
    queryKey: ["tenantApplicationsListTenantApplications", tenantId],
    queryFn: async () =>
      (await tenantApplicationsListTenantApplications(tenantId!)).data.items,
    enabled: !!tenantId,
  });

  const subscribeMut = useMutation({
    mutationFn: (body: SubscribeTenantApplicationRequest) =>
      tenantApplicationsSubscribeTenantApplication(tenantId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantApplicationsListTenantApplications", tenantId] });
      toast.success("应用已订阅");
    },
    onError: (err) => toast.error(`订阅失败：${toApiError(err).message}`),
  });

  const updateMut = useMutation({
    mutationFn: ({ clientId, data }: { clientId: string; data: UpdateTenantApplicationRequest }) =>
      tenantApplicationsUpdateTenantApplication(tenantId!, clientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantApplicationsListTenantApplications", tenantId] });
      toast.success("订阅已更新");
    },
    onError: (err) => toast.error(`更新失败：${toApiError(err).message}`),
  });

  const removeMut = useMutation({
    mutationFn: (clientId: string) =>
      tenantApplicationsRemoveTenantApplication(tenantId!, clientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantApplicationsListTenantApplications", tenantId] });
      toast.success("订阅已取消");
    },
    onError: (err) => toast.error(`取消失败：${toApiError(err).message}`),
  });

  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TenantApplication | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TenantApplication | null>(null);

  const apps = list.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="租户应用"
        description={`${tenantLabel} 的应用订阅`}
        actions={
          <Button onClick={() => setSubscribeOpen(true)} data-fn="M00.F05.I02">
            订阅应用
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>应用订阅列表 ({apps.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {list.isPending ? (
            <PageLoading />
          ) : apps.length === 0 ? (
            <EmptyState
              title="还没有订阅应用"
              description="点击「订阅应用」为租户启用第一个业务应用"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client ID</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>到期时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((a) => (
                  <TableRow key={a.id} data-testid="tenant-app-row">
                    <TableCell className="font-mono text-xs">{a.clientId}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${
                          a.status === 1
                            ? "bg-blue-50 text-blue-700"
                            : a.status === 0
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {statusToLabel(a.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatExpireTime(a.expireTime)}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-fn="M00.F05.I03"
                        onClick={() => setEditTarget(a)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-fn="M00.F05.I04"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setRemoveTarget(a)}
                      >
                        取消订阅
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CrudDialog
        open={subscribeOpen}
        onOpenChange={setSubscribeOpen}
        title="订阅应用"
        description="输入应用 Client ID 与（可选）到期时间。订阅后租户内的角色可分配菜单权限。"
        fields={SUBSCRIBE_FIELDS}
        submitText="创建"
        loading={subscribeMut.isPending}
        onSubmit={async (values) => {
          await subscribeMut.mutateAsync({
            clientId: String(values.clientId ?? "").trim(),
            expireTime: values.expireTime ? String(values.expireTime) : undefined,
          });
          setSubscribeOpen(false);
        }}
      />

      <CrudDialog
        open={Boolean(editTarget)}
        onOpenChange={(o) => !o && setEditTarget(null)}
        title="编辑订阅"
        fields={UPDATE_FIELDS}
        initialValues={
          editTarget
            ? {
                status: String(editTarget.status),
                expireTime: editTarget.expireTime ?? "",
              }
            : undefined
        }
        loading={updateMut.isPending}
        onSubmit={async (values) => {
          if (!editTarget) return;
          await updateMut.mutateAsync({
            clientId: editTarget.clientId,
            data: {
              status: Number(values.status),
              expireTime: values.expireTime ? String(values.expireTime) : undefined,
            },
          });
          setEditTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={`取消订阅「${removeTarget?.clientId ?? ""}」？`}
        description="租户下该应用的所有角色菜单授权将一并清除。不可撤销。"
        confirmText="取消订阅"
        destructive
        loading={removeMut.isPending}
        onConfirm={async () => {
          if (!removeTarget) return;
          await removeMut.mutateAsync(removeTarget.clientId);
          setRemoveTarget(null);
        }}
      />
    </div>
  );
}
