// M06.F01 — tenant-scoped 审计日志
import { useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { getTenant } from "@saas/identity-platform-msw";

interface AuditRow {
  id: string;
  action: string;
  actorUserId?: string;
  occurredAt: string;
}

const EVENTS: AuditRow[] = [
  { id: "e1", action: "user_created", actorUserId: "alice", occurredAt: "2026-08-10T10:00:00Z" },
  { id: "e2", action: "login_success", actorUserId: "alice", occurredAt: "2026-08-12T08:30:00Z" },
  { id: "e3", action: "api_key_created", actorUserId: "dave", occurredAt: "2026-08-11T14:20:00Z" },
];

const ACTION_LABEL: Record<string, string> = {
  user_created: "创建用户",
  user_updated: "更新用户",
  login_success: "登录成功",
  login_failed: "登录失败",
  api_key_created: "创建 API Key",
  api_key_revoked: "吊销 API Key",
  role_assigned: "分配角色",
  role_revoked: "撤销角色",
};

const ACTION_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  user_created: "default",
  user_updated: "outline",
  login_success: "default",
  login_failed: "outline",
  api_key_created: "default",
  api_key_revoked: "secondary",
  role_assigned: "outline",
  role_revoked: "secondary",
};

export function AuditListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const tenant = tenantId ? getTenant(tenantId) : undefined;
  const tenantLabel = tenant
    ? `${tenant.name}（${tenant.code}）`
    : tenantId ?? "未知租户";

  return (
    <div className="space-y-6">
      <PageHeader
        title="审计日志"
        description={
          <span>
            租户 <span className="font-semibold text-slate-700">{tenantLabel}</span> 的操作事件流
          </span>
        }
        actions={
          <Button variant="outline" data-fn="M06.F01.I03">
            <Download className="h-4 w-4 mr-2" />
            导出 CSV
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>事件 ({EVENTS.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>动作</TableHead>
                <TableHead>操作者</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {EVENTS.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-slate-500 tabular-nums">
                    {new Date(e.occurredAt).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ACTION_VARIANT[e.action] ?? "outline"}>
                      {ACTION_LABEL[e.action] ?? e.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {e.actorUserId ?? "—"}
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
