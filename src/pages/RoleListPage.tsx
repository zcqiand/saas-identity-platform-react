// M00.F03 — tenant-scoped 角色列表（CRUD + 菜单授权入口）
// 2026-09-11 E2E REQ-2026-005：barrel 死桩切真源（tenant-roles tag）+ 契约字段
// code/name→roleCode/roleName + 删 I01 权限矩阵死按钮（PUT permissions 契约已废弃，
// 权限面由 role-menus 承接，对齐 vue/nextjs 基准）。

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  tenantRolesCreateSysRole,
  tenantRolesDeleteSysRole,
  tenantRolesListSysRoles,
  tenantRolesUpdateSysRole,
} from "@/api/endpoints/tenant-roles/tenant-roles";
import { useAdminTenantsGetTenant } from "@/api/endpoints/admin-tenants/admin-tenants";
import type { CreateSysRoleRequest, SysRole, UpdateSysRoleRequest } from "@/api/endpoints/model";
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
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CrudDialog, type FieldDef } from "@/components/app/crud-dialog";
import { toApiError } from "@/api/http-client";
import { toast } from "sonner";

const FIELDS: FieldDef[] = [
  { name: "roleCode", label: "Code", required: true, placeholder: "admin" },
  { name: "roleName", label: "名称", required: true, placeholder: "管理员" },
];

const EDIT_FIELDS = FIELDS.filter((f) => f.name !== "roleCode");

export function RoleListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const qc = useQueryClient();
  const tenantQ = useAdminTenantsGetTenant(tenantId!, { query: { enabled: !!tenantId } });
  const tenant = tenantQ.data?.data ?? null;
  const tenantLabel = tenant ? `租户 ${tenant.name}（${tenant.tenantKey}）` : "租户未知";

  const list = useQuery<SysRole[]>({
    queryKey: ["tenantRolesListSysRoles", tenantId],
    queryFn: async () => (await tenantRolesListSysRoles(tenantId!, { clientId: "" })).data.items,
    enabled: !!tenantId,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateSysRoleRequest) => tenantRolesCreateSysRole(tenantId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantRolesListSysRoles", tenantId] });
      toast.success("角色已创建");
    },
    onError: (err) => toast.error(`创建失败：${toApiError(err).message}`),
  });

  const updateMut = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: UpdateSysRoleRequest }) =>
      tenantRolesUpdateSysRole(tenantId!, roleId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantRolesListSysRoles", tenantId] });
      toast.success("角色已更新");
    },
    onError: (err) => toast.error(`更新失败：${toApiError(err).message}`),
  });

  const deleteMut = useMutation({
    mutationFn: (roleId: string) => tenantRolesDeleteSysRole(tenantId!, roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantRolesListSysRoles", tenantId] });
      toast.success("角色已删除");
    },
    onError: (err) => toast.error(`删除失败：${toApiError(err).message}`),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SysRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SysRole | null>(null);

  const roles = list.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="角色权限"
        description={`${tenantLabel} 的角色矩阵`}
        actions={
          <Button onClick={() => setCreateOpen(true)} data-fn="M00.F03.I02">
            新建角色
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>角色列表 ({roles.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {list.isPending ? (
            <PageLoading />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.id} data-testid="role-row">
                    <TableCell className="font-mono text-xs">{r.roleCode}</TableCell>
                    <TableCell className="font-medium">{r.roleName}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" data-fn="M00.F04.I02" asChild>
                        <Link to={`/tenants/${tenantId}/roles/${r.id}/menus`}>菜单授权</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-fn="M00.F03.I04"
                        onClick={() => setEditTarget(r)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-fn="M00.F03.I05"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteTarget(r)}
                      >
                        删除
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
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="新建角色"
        fields={FIELDS}
        submitText="创建"
        loading={createMut.isPending}
        onSubmit={async (values) => {
          await createMut.mutateAsync({
            ...(values as unknown as CreateSysRoleRequest),
            clientId: "saas-console",
          });
          setCreateOpen(false);
        }}
      />

      <CrudDialog
        open={Boolean(editTarget)}
        onOpenChange={(o) => !o && setEditTarget(null)}
        title="编辑角色"
        fields={EDIT_FIELDS}
        initialValues={editTarget ? { roleName: editTarget.roleName } : undefined}
        loading={updateMut.isPending}
        onSubmit={async (values) => {
          if (!editTarget) return;
          await updateMut.mutateAsync({
            roleId: editTarget.id,
            data: { roleName: values.roleName as string },
          });
          setEditTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`删除角色「${deleteTarget?.roleName ?? ""}」？`}
        description="角色删除将一并解除角色与用户的绑定关系。"
        confirmText="删除"
        destructive
        loading={deleteMut.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMut.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
