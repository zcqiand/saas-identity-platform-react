// M01.F01 — tenant-scoped 用户列表（CRUD）
// 走 tenantUsersListUsers / createUser / updateUser / deleteUser（orval 1:1 端点）

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  tenantRolesListRoles,
  tenantUsersAssignRoles,
  tenantUsersCreateUser,
  tenantUsersDeleteUser,
  tenantUsersListUsers,
  tenantUsersUpdateUser,
} from "@/api/endpoints/endpoints";
import type {
  CreateUserRequest,
  UpdateUserRequest,
  User,
} from "@/api/endpoints/endpoints.schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CrudDialog, type FieldDef } from "@/components/app/crud-dialog";
import { toApiError } from "@/api/http-client";
import { toast } from "sonner";
import { getTenant } from "@saas/identity-platform-msw";

const FIELDS: FieldDef[] = [
  { name: "username", label: "用户名", required: true, placeholder: "alice" },
  { name: "email", label: "邮箱", required: true, placeholder: "alice@acme.io" },
  {
    name: "status",
    label: "状态",
    type: "select",
    required: true,
    defaultValue: "invited",
    options: [
      { value: "active", label: "启用" },
      { value: "invited", label: "已邀请" },
      { value: "suspended", label: "暂停" },
      { value: "disabled", label: "停用" },
    ],
  },
];

const EDIT_FIELDS = FIELDS.filter((f) => f.name !== "username");

export function UserListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const qc = useQueryClient();
  const tenant = tenantId ? getTenant(tenantId) ?? null : null;
  const tenantLabel = tenant ? `租户 ${tenant.name}（${tenant.code}）` : "租户未知";

  const usersQ = useQuery({
    queryKey: ["tenantUsersListUsers", tenantId],
    queryFn: async () => (await tenantUsersListUsers(tenantId!)).data.items,
    enabled: !!tenantId,
  });

  const rolesQ = useQuery({
    queryKey: ["tenantRolesListRoles", tenantId],
    queryFn: async () => (await tenantRolesListRoles(tenantId!)).data.items,
    enabled: !!tenantId,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateUserRequest) => tenantUsersCreateUser(tenantId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantUsersListUsers", tenantId] });
      toast.success("用户已创建");
    },
    onError: (err) => toast.error(`创建失败：${toApiError(err).message}`),
  });

  const updateMut = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserRequest }) =>
      tenantUsersUpdateUser(tenantId!, userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantUsersListUsers", tenantId] });
      toast.success("用户已更新");
    },
    onError: (err) => toast.error(`更新失败：${toApiError(err).message}`),
  });

  const deleteMut = useMutation({
    mutationFn: (userId: string) => tenantUsersDeleteUser(tenantId!, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantUsersListUsers", tenantId] });
      toast.success("用户已删除");
    },
    onError: (err) => toast.error(`删除失败：${toApiError(err).message}`),
  });

  const roleAssignMut = useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      tenantUsersAssignRoles(tenantId!, userId, { roleIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantUsersListUsers", tenantId] });
      toast.success("角色已分配");
    },
    onError: (err) => toast.error(`角色分配失败：${toApiError(err).message}`),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);

  const users = usersQ.data ?? [];
  const roles = rolesQ.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户管理"
        description={`${tenantLabel} 的所有用户`}
        actions={
          <Button onClick={() => setCreateOpen(true)} data-fn="M01.F01.I02">
            邀请用户
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>用户列表 ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>角色</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} data-testid="user-row">
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="text-slate-500">{u.email}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">
                      {(u.roleIds ?? []).length} 项
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-fn="M01.F02.I01"
                      onClick={() => setRoleTarget(u)}
                    >
                      分配角色
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-fn="M01.F01.I04"
                      onClick={() => setEditTarget(u)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-fn="M01.F01.I05"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTarget(u)}
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
        title="邀请用户"
        description="向租户添加一个新用户。"
        fields={FIELDS}
        submitText="创建"
        loading={createMut.isPending}
        onSubmit={async (values) => {
          await createMut.mutateAsync(values as unknown as CreateUserRequest);
          setCreateOpen(false);
        }}
      />

      <CrudDialog
        open={Boolean(editTarget)}
        onOpenChange={(o) => !o && setEditTarget(null)}
        title="编辑用户"
        fields={EDIT_FIELDS}
        initialValues={
          editTarget
            ? { email: editTarget.email, status: editTarget.status }
            : undefined
        }
        loading={updateMut.isPending}
        onSubmit={async (values) => {
          if (!editTarget) return;
          await updateMut.mutateAsync({
            userId: editTarget.id,
            data: {
              email: values.email as string,
              status: values.status as User["status"],
            },
          });
          setEditTarget(null);
        }}
      />

      <CrudDialog
        open={Boolean(roleTarget)}
        onOpenChange={(o) => !o && setRoleTarget(null)}
        title={`分配角色：${roleTarget?.username ?? ""}`}
        fields={[
          {
            name: "roleIds",
            label: "角色（多选）",
            type: "select",
            options: roles.map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` })),
          },
        ]}
        submitText="保存角色"
        loading={roleAssignMut.isPending}
        initialValues={
          roleTarget
            ? { roleIds: (roleTarget.roleIds ?? []).join(",") }
            : undefined
        }
        renderField={(_field, _value, onChange) => (
          <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2">
            {roles.length === 0 && <div className="text-xs text-slate-400">暂无角色</div>}
            {roles.map((r) => {
              const checked = (roleTarget?.roleIds ?? []).includes(r.id);
              return (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(roleTarget?.roleIds ?? []);
                      if (e.target.checked) next.add(r.id);
                      else next.delete(r.id);
                      onChange(Array.from(next));
                    }}
                  />
                  <span className="font-mono text-xs">{r.code}</span>
                  <span>{r.name}</span>
                </label>
              );
            })}
          </div>
        )}
        onSubmit={async (values) => {
          if (!roleTarget) return;
          const roleIds = Array.isArray(values.roleIds) ? (values.roleIds as string[]) : [];
          await roleAssignMut.mutateAsync({ userId: roleTarget.id, roleIds });
          setRoleTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`删除用户「${deleteTarget?.username ?? ""}」？`}
        description="用户删除后不可恢复，已分配的关联角色也会一并解除。"
        confirmText="删除"
        destructive
        loading={deleteMut.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMut.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <p className="text-xs text-slate-400">
        <Link to="../roles" className="underline">角色权限 →</Link>
      </p>
    </div>
  );
}