// M01.F01 — tenant-scoped 成员管理（列表 / 创建 / 邀请 / 详情 / 编辑 / 启停 / 角色 / 删除）
// 走 tenantMembersListTenantUsers / createTenantUser / updateTenantUser /
// getTenantUser / inviteTenantUser / changeTenantUserStatus / deleteTenantUser /
// assignTenantMemberRoles（orval 1:1 端点，类型只用生成物）
// @entry M00.F02.I01 — 成员列表（本页表格，tenantMembersListTenantUsers，支持分页与状态过滤）
// @entry M00.F02.I02 — 创建成员（「创建成员」弹窗，createTenantUser + 二步 assignRoles）
// @entry M00.F02.I03 — 成员详情（行内「详情」弹层，tenantMembersGetTenantUser）
// @entry M00.F02.I04 — 编辑成员（email/mobile 全字段，updateTenantUser）
// @entry M00.F02.I06 — 邀请成员（「邀请成员」弹窗，tenantMembersInviteTenantUser）
// @entry M00.F02.I08 — 独立启停（行内「停用/启用」+ ConfirmDialog，changeTenantUserStatus）

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminTenantsGetTenant } from "@/api/endpoints/admin-tenants/admin-tenants";
import {
  tenantMembersAssignTenantMemberRoles,
  tenantMembersChangeTenantUserStatus,
  tenantMembersCreateTenantUser,
  tenantMembersDeleteTenantUser,
  tenantMembersGetTenantUser,
  tenantMembersInviteTenantUser,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

// 含 2：分页行为断言需要「每页 2 条」档（tenant1 种子 3 人 → 首页 2 行 + 第 2 页 1 行）
const PAGE_SIZES = [2, 5, 10, 20];

// ADR-0029 双形态兼容：嵌套 TenantMemberView（aspnetcore）/扁平 TenantMemberUserView
// （msw/nextjs）统一归一化。状态取生成 TenantMemberStatus（active|invited|suspended|disabled）。
interface MemberUserRow {
  id: string;
  username: string;
  email: string;
  mobile?: string;
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
      mobile?: string;
      status?: TenantMemberStatus;
    };
    const status = (member.status ?? user.status ?? "active") as TenantMemberStatus;
    return {
      id: user.id ?? member.id,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      status,
      roleIds: (r.roles as string[] | undefined) ?? [],
    };
  }
  return r as unknown as MemberUserRow;
}

// 创建走契约 CreateSysUserRequest {username, password, email?, mobile?}——status
// 不在 create body（成员初始态由后端定），状态变更走 changeTenantUserStatus。
// 角色不在 create body（契约无 roleIds）——勾选项在创建成功后二步走 assignRoles。
const CREATE_FIELDS: FieldDef[] = [
  { name: "username", label: "用户名", required: true, placeholder: "alice" },
  { name: "password", label: "初始密码", required: true, placeholder: "至少 8 位" },
  { name: "email", label: "邮箱", required: true, placeholder: "alice@acme.io" },
];
const CREATE_ROLE_FIELD: FieldDef = { name: "roleIds", label: "角色（多选）" };

// 编辑只走契约 UpdateSysUserRequest {email?, mobile?}——status 已移出编辑弹窗，
// 独立启停走行内按钮 + changeTenantUserStatus（I08）。
const EDIT_FIELDS: FieldDef[] = [
  { name: "email", label: "邮箱", required: true, placeholder: "alice@acme.io" },
  { name: "mobile", label: "手机号", placeholder: "13800000000" },
];

export function UserListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const qc = useQueryClient();
  // orval 生成的 react-query hook：拉取当前 tenant 的元数据。tenantId 缺失时
  // 不发请求，加载中/失败显示 fallback。
  const tenantQ = useAdminTenantsGetTenant(tenantId!, { query: { enabled: !!tenantId } });
  const tenant = tenantQ.data?.data ?? null;
  const tenantLabel = tenant ? `租户 ${tenant.name}（${tenant.tenantKey}）` : "租户未知";

  const [statusFilter, setStatusFilter] = useState<TenantMemberStatus | "">("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const usersQ = useQuery({
    queryKey: ["tenantMembersListTenantUsers", tenantId, page, pageSize, statusFilter],
    queryFn: async () => {
      const res = await tenantMembersListTenantUsers(tenantId!, {
        page,
        pageSize,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      return {
        rows: (res.data.items as unknown as unknown[]).map(normalizeMemberRow),
        total: res.data.total,
      };
    },
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

  const inviteMut = useMutation({
    mutationFn: (data: { email?: string; mobile?: string }) =>
      tenantMembersInviteTenantUser(tenantId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantMembersListTenantUsers", tenantId] });
      toast.success("邀请已发送");
    },
    onError: (err) => toast.error(`邀请失败：${toApiError(err).message}`),
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MemberUserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberUserRow | null>(null);
  const [roleTarget, setRoleTarget] = useState<MemberUserRow | null>(null);
  const [detailTarget, setDetailTarget] = useState<MemberUserRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<MemberUserRow | null>(null);

  // I03 详情：GetTenantUser 完整信息（TenantMemberUserView），只读展示
  const detailQ = useQuery({
    queryKey: ["tenantMembersGetTenantUser", tenantId, detailTarget?.id],
    queryFn: async () => (await tenantMembersGetTenantUser(tenantId!, detailTarget!.id)).data,
    enabled: Boolean(tenantId && detailTarget),
  });

  const users = usersQ.data?.rows ?? [];
  const total = usersQ.data?.total ?? 0;
  const roles = rolesQ.data ?? [];
  const detail = detailQ.data;
  const detailRoleText = detail
    ? (
        detail.roleIds
          .map((id) => roles.find((r) => r.id === id)?.roleCode)
          .filter(Boolean) as string[]
      ).join("、") || "—"
    : "加载中…";

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户管理"
        description={`${tenantLabel} 的所有用户`}
        actions={
          <>
            <Button variant="outline" onClick={() => setInviteOpen(true)} data-fn="M00.F02.I06">
              邀请成员
            </Button>
            <Button onClick={() => setCreateOpen(true)} data-fn="M01.F04.I03">
              创建成员
            </Button>
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle data-testid="user-total">用户列表 (共 {total} 人)</CardTitle>
          <div className="flex items-center gap-2">
            <select
              aria-label="状态过滤"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as TenantMemberStatus | "");
                setPage(0);
              }}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">全部状态</option>
              <option value="active">启用</option>
              <option value="invited">已邀请</option>
              <option value="suspended">暂停</option>
              <option value="disabled">停用</option>
            </select>
            <select
              aria-label="每页"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="border rounded px-2 py-1 text-sm"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} 条/页
                </option>
              ))}
            </select>
          </div>
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
                        data-fn="M00.F02.I03"
                        onClick={() => setDetailTarget(u)}
                      >
                        详情
                      </Button>
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
                        data-fn="M00.F02.I08"
                        onClick={() => setStatusTarget(u)}
                      >
                        {u.status === "active" ? "停用" : "启用"}
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
        <div className="flex items-center justify-between px-6 py-3 text-sm">
          <span data-testid="user-page-indicator">第 {page + 1} 页</span>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(page + 1) * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      </Card>

      <CrudDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="创建成员"
        description="向租户添加一个新用户（契约 CreateSysUserRequest：用户名 + 初始密码 + 邮箱；角色创建后二步绑定）。"
        fields={[...CREATE_FIELDS, CREATE_ROLE_FIELD]}
        initialValues={{ roleIds: [] }}
        submitText="创建"
        loading={createMut.isPending || roleAssignMut.isPending}
        renderField={(field, value, onChange) => {
          if (field.name !== "roleIds") {
            return (
              <Input
                id={`crud-field-${field.name}`}
                value={String(value ?? "")}
                onChange={(e) => onChange(e.target.value)}
                placeholder={field.placeholder}
              />
            );
          }
          const selected = Array.isArray(value) ? (value as string[]) : [];
          return (
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2">
              {roles.length === 0 && <div className="text-xs text-slate-400">暂无角色</div>}
              {roles.map((r) => {
                const checked = selected.includes(r.id);
                return (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(selected);
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
          );
        }}
        onSubmit={async (values) => {
          const roleIds = Array.isArray(values.roleIds) ? (values.roleIds as string[]) : [];
          const res = await createMut.mutateAsync({
            username: String(values.username ?? "").trim(),
            password: String(values.password ?? ""),
            email: (values.email as string) || undefined,
          });
          if (roleIds.length > 0) {
            await roleAssignMut.mutateAsync({ userId: res.data.id, roleIds });
          }
          setCreateOpen(false);
        }}
      />

      <CrudDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="邀请成员"
        description="发送邀请（后端语义：新建 status=invited 的成员，username 取邮箱前缀；无邀请链接展示面）。"
        fields={[
          { name: "email", label: "邮箱", required: true, placeholder: "ivy@acme.io" },
          { name: "mobile", label: "手机号", placeholder: "13800000000" },
        ]}
        submitText="发送邀请"
        loading={inviteMut.isPending}
        onSubmit={async (values) => {
          await inviteMut.mutateAsync({
            email: (values.email as string) || undefined,
            mobile: (values.mobile as string) || undefined,
          });
          setInviteOpen(false);
        }}
      />

      <CrudDialog
        open={Boolean(editTarget)}
        onOpenChange={(o) => !o && setEditTarget(null)}
        title="编辑用户"
        fields={EDIT_FIELDS}
        initialValues={
          editTarget ? { email: editTarget.email, mobile: editTarget.mobile ?? "" } : undefined
        }
        loading={updateMut.isPending}
        onSubmit={async (values) => {
          if (!editTarget) return;
          await updateMut.mutateAsync({
            userId: editTarget.id,
            data: {
              email: values.email as string,
              mobile: (values.mobile as string) || undefined,
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

      <Dialog open={Boolean(detailTarget)} onOpenChange={(o) => !o && setDetailTarget(null)}>
        <DialogContent data-testid="member-detail-dialog">
          <DialogHeader>
            <DialogTitle>成员详情：{detail?.username ?? detailTarget?.username ?? ""}</DialogTitle>
            <DialogDescription>契约 TenantMemberUserView 完整信息（只读）。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">用户名</span>
              <span>{detail?.username ?? detailTarget?.username ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">邮箱</span>
              <span>{detail?.email ?? detailTarget?.email ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">手机号</span>
              <span>{detailTarget?.mobile ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">状态</span>
              <StatusBadge status={(detail?.status ?? detailTarget?.status)!} />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">所属租户</span>
              <span className="font-mono text-xs">{detail?.tenantId ?? tenantId}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">角色</span>
              <span>{detailRoleText}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">创建时间</span>
              <span>{detail?.createdAt ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">更新时间</span>
              <span>{detail?.updatedAt ?? "—"}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(o) => !o && setStatusTarget(null)}
        title={`确认${statusTarget?.status === "active" ? "停用" : "启用"}「${statusTarget?.username ?? ""}」？`}
        description={
          statusTarget?.status === "active"
            ? "停用后该成员将无法登录本租户。"
            : "启用后该成员恢复登录本租户。"
        }
        confirmText="确认"
        loading={statusMut.isPending}
        onConfirm={async () => {
          if (!statusTarget) return;
          await statusMut.mutateAsync({
            userId: statusTarget.id,
            status: statusTarget.status === "active" ? "suspended" : "active",
          });
          setStatusTarget(null);
        }}
      />
    </div>
  );
}
