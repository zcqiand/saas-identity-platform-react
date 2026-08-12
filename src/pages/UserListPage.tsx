// M01.F01 — tenant-scoped 用户列表
import { useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";

interface UserRow {
  id: string;
  username: string;
  email: string;
  status: "active" | "invited" | "suspended" | "disabled";
}

const USERS: UserRow[] = [
  { id: "u1", username: "alice", email: "alice@acme.io", status: "active" },
  { id: "u2", username: "bob", email: "bob@acme.io", status: "invited" },
  { id: "u3", username: "carol", email: "carol@acme.io", status: "invited" },
];

export function UserListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  return (
    <div className="space-y-6">
      <PageHeader
        title="用户管理"
        description={
          <span>
            租户 <span className="font-mono text-xs">{tenantId?.slice(0, 8)}…</span> 的所有用户
          </span>
        }
        actions={
          <Button data-fn="M01.F01.I02">
            <Plus className="h-4 w-4 mr-2" />
            邀请用户
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>用户列表 ({USERS.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {USERS.map((u) => (
                <TableRow key={u.id} data-testid="user-row">
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="text-slate-500">{u.email}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" data-fn="M01.F02.I01">
                      角色
                    </Button>
                    <Button variant="ghost" size="sm" data-fn="M01.F01.I04">
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-fn="M01.F01.I05"
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