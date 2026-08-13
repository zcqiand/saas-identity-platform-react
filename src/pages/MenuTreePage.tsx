// M08 — 应用下树形菜单 CRUD
// 应用切换器（lab/erp/crm）+ 默认必选中（lab-management）+ localStorage 记住

import { useState, useMemo } from "react";
import { ChevronRight, FolderTree } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminAppMenusCreateMenu,
  adminAppMenusDeleteMenu,
  adminAppMenusListMenus,
  adminAppMenusMoveMenu,
  adminAppMenusUpdateMenu,
  useAdminAppsListApps,
} from "@/api/endpoints/endpoints";
import type {
  CreateMenuRequest,
  Menu,
  UpdateMenuRequest,
} from "@/api/endpoints/endpoints.schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CrudDialog, type FieldDef } from "@/components/app/crud-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSelection } from "@/state/selection-context";
import { useTenant } from "@/state/tenant-context";
import { toApiError } from "@/api/http-client";
import { toast } from "sonner";

const FIELDS: FieldDef[] = [
  { name: "code", label: "Code", required: true, placeholder: "m-xxx" },
  { name: "name", label: "名称", required: true, placeholder: "接样管理" },
  { name: "path", label: "路径", placeholder: "receipts" },
  {
    name: "type",
    label: "类型",
    type: "select",
    required: true,
    defaultValue: "page",
    options: [
      { value: "group", label: "分组（容器）" },
      { value: "page", label: "页面（叶子）" },
      { value: "action", label: "操作（按钮）" },
    ],
  },
  {
    name: "parentId",
    label: "父菜单",
    type: "select",
    options: [],
    placeholder: "（无，顶级）",
  },
  { name: "sortOrder", label: "排序", type: "number", defaultValue: 0 },
  {
    name: "status",
    label: "状态",
    type: "select",
    required: true,
    defaultValue: "active",
    options: [
      { value: "active", label: "启用" },
      { value: "disabled", label: "停用" },
    ],
  },
];

const EDIT_FIELDS = FIELDS.filter((f) => f.name !== "code");

function flatten(nodes: Menu[], depth = 0): Array<Menu & { depth: number }> {
  const out: Array<Menu & { depth: number }> = [];
  for (const n of nodes) {
    out.push({ ...n, depth });
    const children = (n as any).children as Menu[] | undefined;
    if (children && children.length) out.push(...flatten(children, depth + 1));
  }
  return out;
}

export function MenuTreePage() {
  const { selectedApp, setSelectedApp } = useSelection();
  const { currentTenantId } = useTenant();
  const qc = useQueryClient();

  // 应用列表（平台 admin 视角 → 用 useAdminAppsListApps,跨 msw/后端模式同源）
  const appsQ = useAdminAppsListApps();
  const allApps = appsQ.data?.data?.items ?? [];
  const currentApp = useMemo(
    () => allApps.find((a) => a.id === selectedApp.id) ?? allApps[0],
    [selectedApp, allApps],
  );

  const menusQ = useQuery({
    queryKey: ["adminAppMenusListMenus", currentApp?.id],
    queryFn: async () => (await adminAppMenusListMenus(currentApp!.id)).data,
    enabled: !!currentApp,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateMenuRequest) => adminAppMenusCreateMenu(currentApp!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminAppMenusListMenus", currentApp!.id] });
      toast.success("菜单已创建");
    },
    onError: (err) => toast.error(`创建失败：${toApiError(err).message}`),
  });

  const updateMut = useMutation({
    mutationFn: ({ menuId, data }: { menuId: string; data: UpdateMenuRequest }) =>
      adminAppMenusUpdateMenu(currentApp!.id, menuId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminAppMenusListMenus", currentApp!.id] });
      toast.success("菜单已更新");
    },
    onError: (err) => toast.error(`更新失败：${toApiError(err).message}`),
  });

  const deleteMut = useMutation({
    mutationFn: (menuId: string) => adminAppMenusDeleteMenu(currentApp!.id, menuId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminAppMenusListMenus", currentApp!.id] });
      toast.success("菜单已删除");
    },
    onError: (err) => toast.error(`删除失败：${toApiError(err).message}`),
  });

  const moveMut = useMutation({
    mutationFn: ({ menuId, parentId }: { menuId: string; parentId?: string }) =>
      adminAppMenusMoveMenu(currentApp!.id, menuId, { parentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminAppMenusListMenus", currentApp!.id] });
      toast.success("父级已切换");
    },
    onError: (err) => toast.error(`移动失败：${toApiError(err).message}`),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Menu | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Menu | null>(null);
  const [moveTarget, setMoveTarget] = useState<Menu | null>(null);

  const rows = useMemo(() => flatten((menusQ.data ?? []) as Menu[]), [menusQ.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="菜单管理"
        description={
          <span>
            当前应用{" "}
            <span className="font-semibold text-slate-700">{currentApp?.name ?? "—"}</span>{" "}
            <span className="font-mono text-xs text-slate-500">({currentApp?.code})</span>
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Select
              value={currentApp?.id}
              onValueChange={(id) => {
                const a = allApps.find((x) => x.id === id);
                if (a) setSelectedApp({ id: a.id, name: a.name });
              }}
            >
              <SelectTrigger className="w-64" data-testid="app-selector-trigger">
                <SelectValue placeholder="选择应用" />
              </SelectTrigger>
              <SelectContent>
                {allApps.map((a) => (
                  <SelectItem key={a.id} value={a.id} data-testid={`app-option-${a.id}`}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setCreateOpen(true)} data-fn="M08.F01.I02">
              新建菜单
            </Button>
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-slate-500" />
            菜单树 ({rows.length} 项)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code / 路径</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} data-testid="menu-row" data-depth={r.depth}>
                  <TableCell className="font-mono text-xs">
                    <span style={{ paddingLeft: `${r.depth * 16}px` }} className="inline-flex items-center">
                      {r.depth > 0 && <ChevronRight className="h-3 w-3 text-slate-400 mr-1" />}
                      {r.code}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.name}
                    {r.path && (
                      <span className="ml-2 text-xs text-slate-500 font-mono">{r.path}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {r.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600">{r.sortOrder}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status === "active" ? "active" : "suspended"} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" data-fn="M08.F02.I07" onClick={() => setMoveTarget(r)}>
                      移动
                    </Button>
                    <Button variant="ghost" size="sm" data-fn="M08.F01.I04" onClick={() => setEditTarget(r)}>
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-fn="M08.F01.I05"
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
        title="新建菜单"
        fields={[
          ...FIELDS,
          {
            name: "parentId",
            label: "父菜单",
            type: "select",
            options: [
              { value: "", label: "（无，顶级）" },
              ...rows.map((m) => ({ value: m.id, label: `${"  ".repeat(m.depth)}${m.code} · ${m.name}` })),
            ],
            defaultValue: "",
          },
        ]}
        submitText="创建"
        loading={createMut.isPending}
        onSubmit={async (values) => {
          const parentId = values.parentId && values.parentId !== "" ? String(values.parentId) : undefined;
          await createMut.mutateAsync({
            code: String(values.code ?? "").trim(),
            name: String(values.name ?? "").trim(),
            path: (values.path as string) || undefined,
            type: values.type as "group" | "page" | "action",
            parentId,
            sortOrder: Number(values.sortOrder ?? 0),
            status: values.status as "active" | "disabled",
          });
          setCreateOpen(false);
        }}
      />

      <CrudDialog
        open={Boolean(editTarget)}
        onOpenChange={(o) => !o && setEditTarget(null)}
        title="编辑菜单"
        fields={EDIT_FIELDS}
        initialValues={
          editTarget
            ? {
                name: editTarget.name,
                path: editTarget.path,
                type: editTarget.type,
                sortOrder: editTarget.sortOrder,
                status: editTarget.status,
              }
            : undefined
        }
        loading={updateMut.isPending}
        onSubmit={async (values) => {
          if (!editTarget) return;
          await updateMut.mutateAsync({
            menuId: editTarget.id,
            data: {
              name: values.name as string,
              path: (values.path as string) || undefined,
              type: values.type as "group" | "page" | "action",
              sortOrder: Number(values.sortOrder ?? 0),
              status: values.status as "active" | "disabled",
            },
          });
          setEditTarget(null);
        }}
      />

      <CrudDialog
        open={Boolean(moveTarget)}
        onOpenChange={(o) => !o && setMoveTarget(null)}
        title={`移动菜单：${moveTarget?.code ?? ""}`}
        description="选择新的父级菜单。无父级 = 顶级。"
        fields={[
          {
            name: "parentId",
            label: "父菜单",
            type: "select",
            options: [
              { value: "", label: "（无，顶级）" },
              ...rows
                .filter((m) => m.id !== moveTarget?.id)
                .map((m) => ({ value: m.id, label: `${"  ".repeat(m.depth)}${m.code} · ${m.name}` })),
            ],
          },
        ]}
        submitText="移动"
        loading={moveMut.isPending}
        initialValues={moveTarget ? { parentId: moveTarget.parentId ?? "" } : undefined}
        onSubmit={async (values) => {
          if (!moveTarget) return;
          const parentId = values.parentId && values.parentId !== "" ? String(values.parentId) : undefined;
          await moveMut.mutateAsync({ menuId: moveTarget.id, parentId });
          setMoveTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`删除菜单「${deleteTarget?.name ?? ""}」？`}
        description="删除菜单会同时移除其下所有子菜单。不可撤销。"
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