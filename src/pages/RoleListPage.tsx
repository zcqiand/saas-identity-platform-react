// M02.F01 — tenant-scoped 角色列表（CRUD + 菜单授权入口）

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  tenantRolesCreateRole,
  tenantRolesDeleteRole,
  tenantRolesListRoles,
  tenantRolesSetPermissions,
  tenantRolesUpdateRole,
} from "@/api/endpoints/endpoints";
import type {
  CreateRoleRequest,
  Role,
  UpdateRoleRequest,
} from "@/api/endpoints/endpoints.schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CrudDialog, type FieldDef } from "@/components/app/crud-dialog";
import { toApiError } from "@/api/http-client";
import { toast } from "sonner";
import { getTenant } from "@saas/identity-platform-msw";

const PERMISSION_OPTIONS = [
  { value: "users.read", label: "users.read" },
  { value: "users.write", label: "users.write" },
  { value: "roles.read", label: "roles.read" },
  { value: "roles.write", label: "roles.write" },
  { value: "api_keys.read", label: "api_keys.read" },
  { value: "api_keys.write", label: "api_keys.write" },
  { value: "audit.read", label: "audit.read" },
];

const FIELDS: FieldDef[] = [
  { name: "code", label: "Code", required: true, placeholder: "admin" },
  { name: "name", label: "名称", required: true, placeholder: "管理员" },
];

const EDIT_FIELDS = FIELDS.filter((f) => f.name !== "code");

export function RoleListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const qc = useQueryClient();
  const tenant = tenantId ? getTenant(tenantId) ?? null : null;
  const tenantLabel = tenant ? `租户 ${tenant.name}（${tenant.code}）` : "租户未知";

  const list = useQuery({
    queryKey: ["tenantRolesListRoles", tenantId],
    queryFn: async () => (await tenantRolesListRoles(tenantId!)).data.items,
    enabled: !!tenantId,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateRoleRequest) => tenantRolesCreateRole(tenantId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantRolesListRoles", tenantId] });
      toast.success("角色已创建");
    },
    onError: (err) => toast.error(`创建失败：${toApiError(err).message}`),
  });

  const updateMut = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: UpdateRoleRequest }) =>
      tenantRolesUpdateRole(tenantId!, roleId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantRolesListRoles", tenantId] });
      toast.success("角色已更新");
    },
    onError: (err) => toast.error(`更新失败：${toApiError(err).message}`),
  });

  const deleteMut = useMutation({
    mutationFn: (roleId: string) => tenantRolesDeleteRole(tenantId!, roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantRolesListRoles", tenantId] });
      toast.success("角色已删除");
    },
    onError: (err) => toast.error(`删除失败：${toApiError(err).message}`),
  });

  const permMut = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      tenantRolesSetPermissions(tenantId!, roleId, { permissionIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantRolesListRoles", tenantId] });
      toast.success("权限已更新");
    },
    onError: (err) => toast.error(`权限更新失败：${toApiError(err).message}`),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [permTarget, setPermTarget] = useState<Role | null>(null);

  const roles = list.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="角色权限"
        description={`${tenantLabel} 的角色矩阵`}
        actions={
          <Button onClick={() => setCreateOpen(true)} data-fn="M02.F01.I02">
            新建角色
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>角色列表 ({roles.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>权限</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id} data-testid="role-row">
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {(r.permissionIds ?? []).length} 项
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" data-fn="M02.F02.I01" onClick={() => setPermTarget(r)}>
                      权限矩阵
                    </Button>
                    <Button variant="ghost" size="sm" data-fn="M09.F01.I01" asChild>
                      <Link to={`/tenants/${tenantId}/roles/${r.id}/menus`}>菜单授权</Link>
                    </Button>
                    <Button variant="ghost" size="sm" data-fn="M02.F01.I04" onClick={() => setEditTarget(r)}>
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-fn="M02.F01.I05"
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
          await createMut.mutateAsync(values as unknown as CreateRoleRequest);
          setCreateOpen(false);
        }}
      />

      <CrudDialog
        open={Boolean(editTarget)}
        onOpenChange={(o) => !o && setEditTarget(null)}
        title="编辑角色"
        fields={EDIT_FIELDS}
        initialValues={editTarget ? { name: editTarget.name } : undefined}
        loading={updateMut.isPending}
        onSubmit={async (values) => {
          if (!editTarget) return;
          await updateMut.mutateAsync({ roleId: editTarget.id, data: { name: values.name as string } });
          setEditTarget(null);
        }}
      />

      <CrudDialog
        open={Boolean(permTarget)}
        onOpenChange={(o) => !o && setPermTarget(null)}
        title={`权限矩阵：${permTarget?.name ?? ""}`}
        fields={[
          {
            name: "permissionIds",
            label: "权限（多选）",
            type: "select",
            options: PERMISSION_OPTIONS,
          },
        ]}
        submitText="保存权限"
        loading={permMut.isPending}
        renderField={(_field, _value, onChange) => (
          <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2">
            {PERMISSION_OPTIONS.map((p) => {
              const checked = (permTarget?.permissionIds ?? []).includes(p.value);
              return (
                <label key={p.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(permTarget?.permissionIds ?? []);
                      if (e.target.checked) next.add(p.value);
                      else next.delete(p.value);
                      onChange(Array.from(next));
                    }}
                  />
                  <span className="font-mono text-xs">{p.value}</span>
                </label>
              );
            })}
          </div>
        )}
        onSubmit={async (values) => {
          if (!permTarget) return;
          const permissionIds = Array.isArray(values.permissionIds) ? (values.permissionIds as string[]) : [];
          await permMut.mutateAsync({ roleId: permTarget.id, permissionIds });
          setPermTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`删除角色「${deleteTarget?.name ?? ""}」？`}
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