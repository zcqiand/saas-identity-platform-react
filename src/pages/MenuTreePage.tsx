// M08 — 应用下树形菜单 CRUD
// 应用切换器（lab/erp/crm）+ 默认必选中（lab-management）+ localStorage 记住
// v0.4.x：真树表格（可展开/收起）。后端返回扁平 Menu[]，前端按 parentId 自构树。
// 注意：n.children 不存在于 Menu 类型（后端契约只有 parentId）—— 旧代码误用顺手在这里修了。

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderTree } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminClientsListClients } from "@/api/endpoints/admin-clients/admin-clients";
import {
  clientMenusCreateSysMenu,
  clientMenusDeleteSysMenu,
  clientMenusListSysMenus,
  clientMenusMoveSysMenu,
  clientMenusUpdateSysMenu,
} from "@/api/endpoints/client-menus/client-menus";
// 2026-09-11 契约对齐 + B 扫尾：函数层已接真源 client-menus（死桩层已删除）。
import type {
  CreateSysMenuRequest as CreateMenuRequest,
  SysMenu as Menu,
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
import { EmptyState } from "@/components/app/empty-state";
import { PageLoading } from "@/components/app/page-loading";
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
  // 2026-09-11 契约对齐：SysMenu{title,type(directory|menu|button),status:number}
  { name: "title", label: "标题", required: true, placeholder: "接样管理" },
  { name: "path", label: "路径", placeholder: "receipts" },
  {
    name: "type",
    label: "类型",
    type: "select",
    required: true,
    defaultValue: "menu",
    options: [
      { value: "directory", label: "目录（容器）" },
      { value: "menu", label: "菜单（叶子）" },
      { value: "button", label: "按钮（操作）" },
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
    defaultValue: "1",
    options: [
      { value: "1", label: "启用" },
      { value: "0", label: "停用" },
    ],
  },
];

const EDIT_FIELDS = FIELDS.filter((f) => f.name !== "title");

interface MenuNode {
  menu: Menu;
  children: MenuNode[];
  hasChildren: boolean;
}

function buildTree(menus: Menu[]): MenuNode[] {
  const byId = new Map<string, MenuNode>();
  for (const m of menus) byId.set(m.id, { menu: m, children: [], hasChildren: false });
  const roots: MenuNode[] = [];
  for (const m of menus) {
    const node = byId.get(m.id)!;
    if (m.parentId && byId.has(m.parentId)) {
      byId.get(m.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  for (const n of byId.values()) n.hasChildren = n.children.length > 0;
  const sortByOrder = (a: MenuNode, b: MenuNode) =>
    a.menu.sortOrder - b.menu.sortOrder || a.menu.title.localeCompare(b.menu.title);
  const recurse = (ns: MenuNode[]) => {
    ns.sort(sortByOrder);
    for (const n of ns) recurse(n.children);
  };
  recurse(roots);
  return roots;
}

function flattenTree(
  nodes: MenuNode[],
  expanded: Set<string>,
  depth: number,
  out: Array<Menu & { depth: number; hasChildren: boolean }>,
) {
  for (const n of nodes) {
    out.push({ ...n.menu, depth, hasChildren: n.hasChildren });
    if (n.hasChildren && expanded.has(n.menu.id)) {
      flattenTree(n.children, expanded, depth + 1, out);
    }
  }
}

export function MenuTreePage() {
  const { selectedApp, setSelectedApp } = useSelection();
  const { currentTenantId } = useTenant();
  const qc = useQueryClient();

  // 应用列表（平台 admin 视角 → 用 useAdminAppsListApps,跨 msw/后端模式同源）
  const appsQ = useAdminClientsListClients();
  // OAuthClient 契约无 code/name；msw App fixture 有 —— 显示层兜底
  const appCode = (a: unknown) =>
    ((a as { code?: string }).code ?? (a as { clientId?: string }).clientId ?? "") as string;
  const appName = (a: unknown) =>
    ((a as { name?: string }).name ?? (a as { clientName?: string }).clientName ?? "") as string;
  const allApps = appsQ.data?.data?.items ?? [];
  // selection-context 按 code 持久化（路由 :appCode + DEFAULT_APP_ID="lab-management"），
  // fixture 中 id 是 UUID、code 是 "lab-management"/"erp"/"crm"。同时匹配 id/code 两路：
  // 真实场景 localStorage 存 code，UUID 路径留给极少数外部直接 set id 的迁移历史。
  const currentApp = useMemo(
    () =>
      allApps.find((a) => appCode(a) === selectedApp.id || a.id === selectedApp.id) ??
      allApps[0],
    [selectedApp, allApps],
  );

  const menusQ = useQuery({
    queryKey: ["clientMenusListSysMenus", currentApp?.id],
    queryFn: async () => (await clientMenusListSysMenus(currentApp!.id)).data,
    enabled: !!currentApp,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateMenuRequest) => clientMenusCreateSysMenu(currentApp!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientMenusListSysMenus", currentApp!.id] });
      toast.success("菜单已创建");
    },
    onError: (err) => toast.error(`创建失败：${toApiError(err).message}`),
  });

  const updateMut = useMutation({
    mutationFn: ({ menuId, data }: { menuId: string; data: Partial<CreateMenuRequest> }) =>
      clientMenusUpdateSysMenu(currentApp!.id, menuId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientMenusListSysMenus", currentApp!.id] });
      toast.success("菜单已更新");
    },
    onError: (err) => toast.error(`更新失败：${toApiError(err).message}`),
  });

  const deleteMut = useMutation({
    mutationFn: (menuId: string) => clientMenusDeleteSysMenu(currentApp!.id, menuId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientMenusListSysMenus", currentApp!.id] });
      toast.success("菜单已删除");
    },
    onError: (err) => toast.error(`删除失败：${toApiError(err).message}`),
  });

  const moveMut = useMutation({
    mutationFn: ({ menuId, parentId }: { menuId: string; parentId?: string }) =>
      clientMenusMoveSysMenu(currentApp!.id, menuId, { parentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientMenusListSysMenus", currentApp!.id] });
      toast.success("父级已切换");
    },
    onError: (err) => toast.error(`移动失败：${toApiError(err).message}`),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Menu | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Menu | null>(null);
  const [moveTarget, setMoveTarget] = useState<Menu | null>(null);
  // 用「collapsed」 而不是「expanded」：初始空，首屏全部父级默认展开。
  // toggle 时把 id 加进/移出 collapsed 集合。
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const allMenus = (menusQ.data ?? []) as Menu[];
  // 父菜单下拉用：无视展开状态的扁平视图（深度缩进）
  const flatForSelect = useMemo(() => {
    const out: Array<{ menu: Menu; depth: number }> = [];
    const walk = (nodes: MenuNode[], depth: number) => {
      for (const n of nodes) {
        out.push({ menu: n.menu, depth });
        walk(n.children, depth + 1);
      }
    };
    walk(buildTree(allMenus), 0);
    return out;
  }, [allMenus]);

  const rows = useMemo(() => {
    const tree = buildTree(allMenus);
    const parentIds = new Set<string>();
    for (const m of allMenus) if (m.parentId) parentIds.add(m.parentId);
    const expanded = new Set<string>();
    for (const id of parentIds) if (!collapsedIds.has(id)) expanded.add(id);
    const out: Array<Menu & { depth: number; hasChildren: boolean }> = [];
    flattenTree(tree, expanded, 0, out);
    return out;
  }, [allMenus, collapsedIds]);

  const toggleExpand = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isExpanded = (id: string) => !collapsedIds.has(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="菜单管理"
        description={
          <span>
            当前应用{" "}
            <span className="font-semibold text-slate-700">{currentApp ? appName(currentApp) : "—"}</span>{" "}
            <span className="font-mono text-xs text-slate-500">({currentApp ? appCode(currentApp) : ""})</span>
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Select
              value={currentApp?.id}
              onValueChange={(id) => {
                const a = allApps.find((x) => x.id === id);
                if (a) setSelectedApp({ id: appCode(a), name: appName(a) });
              }}
            >
              <SelectTrigger className="w-64" data-testid="app-selector-trigger">
                <SelectValue placeholder="选择应用" />
              </SelectTrigger>
              <SelectContent>
                {allApps.map((a) => (
                  <SelectItem key={a.id} value={a.id} data-testid={`app-option-${a.id}`}>
                    {appName(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setCreateOpen(true)} data-fn="M04.F04.I02">
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
          {menusQ.isPending ? (
            <PageLoading />
          ) : rows.length === 0 ? (
            <EmptyState
              title="暂无菜单"
              description="点击右上“新建菜单”开始"
              action={
                <Button data-fn="M04.F04.I02" onClick={() => setCreateOpen(true)}>
                  新建菜单
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    data-testid="menu-row"
                    data-depth={r.depth}
                    data-menu-id={r.id}
                  >
                    <TableCell className="font-mono text-xs">
                      <span
                        style={{ paddingLeft: `${r.depth * 16}px` }}
                        className="inline-flex items-center"
                      >
                        {r.hasChildren ? (
                          <button
                            type="button"
                            aria-label={isExpanded(r.id) ? "折叠子菜单" : "展开子菜单"}
                            data-testid={`menu-toggle-${r.id}`}
                            className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            onClick={() => toggleExpand(r.id)}
                          >
                            {isExpanded(r.id) ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                        ) : (
                          <span className="mr-1 inline-block h-4 w-4" />
                        )}
                        <span>{r.title}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {r.type === "directory" ? "目录" : r.type === "button" ? "按钮" : "菜单"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {r.status === 0 ? "停用" : "启用"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" data-fn="M04.F04.I07" onClick={() => setMoveTarget(r)}>
                        移动
                      </Button>
                      <Button variant="ghost" size="sm" data-fn="M04.F04.I04" onClick={() => setEditTarget(r)}>
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-fn="M04.F04.I05"
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
        title="新建菜单"
        fields={[
          ...FIELDS,
          {
            name: "parentId",
            label: "父菜单",
            type: "select",
            options: [
              { value: "", label: "（无，顶级）" },
              ...rows.map((m) => ({
                value: m.id,
                label: `${"  ".repeat(m.depth)}${m.title} · ${m.path ?? ""}`,
              })),
            ],
            defaultValue: "",
          },
        ]}
        submitText="创建"
        loading={createMut.isPending}
        onSubmit={async (values) => {
          const parentId = values.parentId && values.parentId !== "" ? String(values.parentId) : undefined;
          await createMut.mutateAsync({
            title: String(values.title ?? "").trim(),
            path: (values.path as string) || undefined,
            type: values.type as "directory" | "menu" | "button",
            parentId,
            sortOrder: Number(values.sortOrder ?? 0),
          });
          setCreateOpen(false);
        }}
      />

      <CrudDialog
        open={Boolean(editTarget)}
        onOpenChange={(o) => !o && setEditTarget(null)}
        title="编辑菜单"
        fields={EDIT_FIELDS.map((f) =>
          f.name === "parentId"
            ? {
                ...f,
                options: [
                  { value: "", label: "（无，顶级）" },
                  ...flatForSelect
                    .filter((m) => m.menu.id !== editTarget?.id)
                    .map((m) => ({
                      value: m.menu.id,
                      label: `${"  ".repeat(m.depth)}${m.menu.path ?? ""} · ${m.menu.title}`,
                    })),
                ],
              }
            : f,
        )}
        initialValues={
          editTarget
            ? {
                title: editTarget.title,
                path: editTarget.path,
                type: editTarget.type,
                parentId: editTarget.parentId ?? "",
                sortOrder: editTarget.sortOrder,
                status: String(editTarget.status ?? 1),
              }
            : undefined
        }
        loading={updateMut.isPending}
        onSubmit={async (values) => {
          if (!editTarget) return;
          await updateMut.mutateAsync({
            menuId: editTarget.id,
            data: {
              title: values.title as string,
              path: (values.path as string) || undefined,
              type: values.type as "directory" | "menu" | "button",
              sortOrder: Number(values.sortOrder ?? 0),
              status: Number(values.status ?? 1),
            } as never,
          });
          setEditTarget(null);
        }}
      />

      <CrudDialog
        open={Boolean(moveTarget)}
        onOpenChange={(o) => !o && setMoveTarget(null)}
        title={`移动菜单：${moveTarget?.title ?? ""}`}
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
                .map((m) => ({ value: m.id, label: `${"  ".repeat(m.depth)}${m.title} · ${m.path ?? ""}` })),
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
        title={`删除菜单「${deleteTarget?.title ?? ""}」？`}
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
