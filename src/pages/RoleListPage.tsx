// M02.F01 — tenant-scoped 角色列表
import { useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { getTenant } from "@saas/identity-platform-msw";

interface RoleRow {
  id: string;
  code: string;
  name: string;
  permissions: number;
}

const ROLES: RoleRow[] = [
  { id: "r1", code: "admin", name: "管理员", permissions: 4 },
  { id: "r2", code: "member", name: "普通成员", permissions: 1 },
];

export function RoleListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const tenant = tenantId ? getTenant(tenantId) : undefined;
  const tenantLabel = tenant
    ? `${tenant.name}（${tenant.code}）`
    : tenantId ?? "未知租户";

  return (
    <div className="space-y-6">
      <PageHeader
        title="角色权限"
        description={
          <span>
            租户 <span className="font-semibold text-slate-700">{tenantLabel}</span> 的角色矩阵
          </span>
        }
        actions={
          <Button data-fn="M02.F01.I02">
            <Plus className="h-4 w-4 mr-2" />
            新建角色
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>角色列表 ({ROLES.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>权限数</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {r.permissions} 项
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" data-fn="M02.F02.I01">权限矩阵</Button>
                    <Button variant="ghost" size="sm" data-fn="M02.F01.I04">编辑</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-fn="M02.F01.I05"
                      className="text-red-600 hover:text-red-700"
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
    </div>
  );
}
