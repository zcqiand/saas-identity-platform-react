// M00.F01 — 平台级租户管理（CRUD）
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState } from "@/components/app/empty-state";

interface Tenant {
  id: string;
  code: string;
  name: string;
  status: "active" | "suspended" | "archived";
}

const TENANTS: Tenant[] = [
  { id: "00000000-0000-0000-0000-000000000001", code: "acme", name: "ACME Corp", status: "active" },
  { id: "00000000-0000-0000-0000-000000000002", code: "globex", name: "Globex Industries", status: "active" },
  { id: "00000000-0000-0000-0000-000000000003", code: "initech", name: "Initech", status: "suspended" },
];

export function TenantListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="租户管理"
        description="管理 SaaS 平台上的所有租户账号"
        actions={
          <Button data-fn="M00.F01.I02">
            <Plus className="h-4 w-4 mr-2" />
            新建租户
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>租户列表 ({TENANTS.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {TENANTS.length === 0 ? (
            <EmptyState title="还没有租户" description="创建第一个租户开始使用" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TENANTS.map((t) => (
                  <TableRow key={t.id} data-testid="tenant-row">
                    <TableCell className="font-mono text-xs">{t.code}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" data-fn="M00.F01.I04">
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-fn="M00.F01.I05"
                        className="text-red-600 hover:text-red-700"
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
    </div>
  );
}