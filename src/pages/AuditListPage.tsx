// M06.F01 — tenant-scoped 审计日志（只读）

import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tenantAuditListAuditEvents } from "@/api/endpoints/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";

const ACTION_LABEL: Record<string, string> = {
  user_created: "创建用户",
  user_updated: "更新用户",
  user_deleted: "删除用户",
  login_success: "登录成功",
  login_failed: "登录失败",
  oauth_token_issued: "签发令牌",
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

  const q = useQuery({
    queryKey: ["tenantAuditListAuditEvents", tenantId],
    queryFn: async () => (await tenantAuditListAuditEvents(tenantId!)).data.items,
    enabled: !!tenantId,
  });

  const events = q.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="审计日志"
        description={`租户 ${tenantId?.slice(0, 8) ?? "—"} 的操作事件流`}
      />
      <Card>
        <CardHeader>
          <CardTitle>事件 ({events.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {q.isPending ? (
            <div className="p-8 text-center text-sm text-slate-400">加载中…</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">暂无审计事件</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>动作</TableHead>
                  <TableHead>操作者</TableHead>
                  <TableHead>目标</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
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
                      {e.actorUserId?.slice(-12) ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.targetUserId?.slice(-12) ?? "—"}
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