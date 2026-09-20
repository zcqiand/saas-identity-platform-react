// M01.F01 — tenant-scoped 用户列表（CRUD）
// 走 tenantMembersListTenantUsers / createTenantUser / updateTenantUser /
// changeTenantUserStatus / deleteTenantUser（orval 1:1 端点，类型只用生成物）
// @entry M00.F02.I01 — 成员列表（本页表格，tenantMembersListTenantUsers）
// @entry M00.F02.I02 — 创建成员（「邀请用户」弹窗，createTenantUser）

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminTenantsGetTenant } from "@/api/endpoints/admin-tenants/admin-tenants";
import {
  tenantMembersAssignTenantMemberRoles,
  tenantMembersChangeTenantUserStatus,
  tenantMembersCreateTenantUser,
  tenantMembersDeleteTenantUser,
  tenantMembersListTenantUsers,
  tenantMembersUpdateTenantUser,
} from "@/api/endpoints/tenant-members/tenant-members";
import { tenantRolesListSysRoles } from "@/api/endpoints/tenant-roles/tenant-roles";
import type {
  CreateSysUserRequest,
  SysRole,
  TenantMemberStatus,
  UpdateSysUserRequest,
} from "@/api/endpoints/model";
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
import { StatusBadge } from "@/components/app/status-badge";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CrudDialog, type FieldDef } from "@/components/app/crud-dialog";
import { toApiError } from "@/api/http-client";
import { toast } from "sonner";

// ADR-0029 双形态兼容：嵌套 TenantMemberView（aspnetcore）/扁平 TenantMemberUserView
// （msw/nextjs）统一归一化。状态取生成 TenantMemberStatus（active|invited|suspended|disabled）。
interface MemberUserRow {
  id: string;
  username: string;
  email: string;
  status: TenantMemberStatus;
  roleIds?: string[];
}
function normalizeMemberRow(raw: unknown): MemberUserRow {
  const r = raw as Record<string, unknown>;
  if (r.member && r.user) {
    const member = r.member as { id: string; status?: TenantMemberStatus };
    const user = r.user as {
      id: string;
      username: string;
      email: string;
      status?: TenantMemberStatus;
    };
    const status = (member.status ?? user.status ?? "active") as TenantMemberStatus;
    return {
      id: user.id ?? member.id,
      username: user.username,
      email: user.email,
      status,
      roleIds: (r.roles as string[] | undefined) ?? [],
    };
  }
  return r as unknown as MemberUserRow;
}

// 创建走契约 CreateSysUserRequest {username, password, email?, mobile?}——status
// 不在 create body（成员初始态由后端定），状态变更走 changeTenantUserStatus。
const CREATE_FIELDS: FieldDef[] = [
  { name: "username", label: "用户名", required: true, placeholder: "alice" },
  { name: "password", label: "初始密码", required: true, placeholder: "至少 8 位" },
  { name: "email", label: "邮箱", required: true, placeholder: "alice@acme.io" },
];

// 编辑：email/mobile 走 UpdateSysUserRequest；status 走 TenantMemberStatus
// （changeTenantUserStatus 专用 body，4 态与列表展示一致）。
const EDIT_FIELDS: FieldDef[] = [
  { name: "email", label: "邮箱", required: true, placeholder: "alice@acme.io" },
  {
    name: "status",
    label: "状态",
    type: "select",
    required: true,
    options: [
      { value: "active", label: "启用" },
      { value: "invited", label: "已邀请" },
      { value: "suspended", label: "暂停" },
      { value: "disabled", label: "停用" },
    ],
  },
];

export function UserListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const qc = useQueryClient();
  // orval 生成的 react-query hook：拉取当前 tenant 的元数据。tenantId 缺失时
  // 不发请求，加载中/失败显示 fallback。
  const tenantQ = useAdminTenantsGetTenant(tenantId!, { query: { enabled: !!tenantId } });
  const tenant = tenantQ.data?.data ?? null;
  const tenantLabel = tenant ? `租户 ${tenant.name}（${tenant.tenantKey}）` : "租户未知";

  const usersQ = useQuery<MemberUserRow[]>({
    queryKey: ["tenantMembersListTenantUsers", tenantId],
    queryFn: async () =>
      ((await tenantMembersListTenantUsers(tenantId!)).data.items as unknown as unknown[]).map(
        normalizeMemberRow,
      ),
    enabled: !!tenantId,
  });

  const rolesQ = useQuery<SysRole[]>({
    queryKey: ["tenantRolesListSysRoles", tenantId],
    queryFn: async () => (await tenantRolesListSysRoles(tenantId!, { clientId: "" })).data.items,
    enabled: !!tenantId,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateSysUserRequest) => tenantMembersCreateTenantUser(tenantId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantMembersListTenantUsers", tenantId] });
      toast.success("用户已创建");
    },
    onError: (err) => toast.error(`创建失败：${toApiError(err).message}`),
  });

  const updateMut = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateSysUserRequest }) =>
      tenantMembersUpdateTenantUser(tenantId!, userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantMembersListTenantUsers", tenantId] });
      toast.success("用户已更新");
    },
    onError: (err) => toast.error(`更新失败：${toApiError(err).message}`),
  });

  // 状态走专用端点（TenantMembersChangeTenantUserStatusBody.status = TenantMemberStatus）
  const statusMut = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: TenantMemberStatus }) =>
      tenantMembersChangeTenantUserStatus(tenantId!, userId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantMembersListTenantUsers", tenantId] });
    },
    onError: (err) => toast.error(`状态变更失败：${toApiError(err).message}`),
  });

  const deleteMut = useMutation({
    mutationFn: (userId: string) => tenantMembersDeleteTenantUser(tenantId!, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantMembersListTenantUsers", tenantId] });
      toast.success("用户已删除");
    },
    onError: (err) => toast.error(`删除失败：${toApiError(err).message}`),
  });

  const roleAssignMut = useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      tenantMembersAssignTenantMemberRoles(tenantId!, userId, { roleIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantMembersListTenantUsers", tenantId] });
      toast.success("角色已分配");
    },
    onError: (err) => toast.error(`角色分配失败：${toApiError(err).message}`),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MemberUserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberUserRow | null>(null);
  const [roleTarget, setRoleTarget] = useState<MemberUserRow | null>(null);

  const users = usersQ.data ?? [];
  const roles = rolesQ.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户管理"
        description={`${tenantLabel} 的所有用户`}
        actions={
          <Button onClick={() => setCreateOpen(true)} data-fn="M01.F04.I03">
            邀请用户
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>用户列表 ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {usersQ.isPending ? (
            <PageLoading />
          ) : (
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
                      <span className="text-xs text-slate-500">{(u.roleIds ?? []).length} 项</span>
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
                        data-fn="M00.F02.I04"
                        onClick={() => setEditTarget(u)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-fn="M00.F02.I05"
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
          )}
        </CardContent>
      </Card>

      <CrudDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="邀请用户"
        description="向租户添加一个新用户（契约 CreateSysUserRequest：用户名 + 初始密码 + 邮箱）。"
        fields={CREATE_FIELDS}
        submitText="创建"
        loading={createMut.isPending}
        onSubmit={async (values) => {
          await createMut.mutateAsync({
            username: String(values.username ?? "").trim(),
            password: String(values.password ?? ""),
            email: (values.email as string) || undefined,
          });
          setCreateOpen(false);
        }}
      />

      <CrudDialog
        open={Boolean(editTarget)}
        onOpenChange={(o) => !o && setEditTarget(null)}
        title="编辑用户"
        fields={EDIT_FIELDS}
        initialValues={
          editTarget ? { email: editTarget.email, status: editTarget.status } : undefined
        }
        loading={updateMut.isPending}
        onSubmit={async (values) => {
          if (!editTarget) return;
          await updateMut.mutateAsync({
            userId: editTarget.id,
            data: { email: values.email as string },
          });
          const nextStatus = values.status as TenantMemberStatus;
          if (nextStatus && nextStatus !== editTarget.status) {
            await statusMut.mutateAsync({ userId: editTarget.id, status: nextStatus });
          }
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
            options: roles.map((r) => ({ value: r.id, label: `${r.roleCode} · ${r.roleName}` })),
          },
        ]}
        submitText="保存角色"
        loading={roleAssignMut.isPending}
        initialValues={roleTarget ? { roleIds: (roleTarget.roleIds ?? []).join(",") } : undefined}
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
                  <span className="font-mono text-xs">{r.roleCode}</span>
                  <span>{r.roleName}</span>
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
    </div>
  );
}
