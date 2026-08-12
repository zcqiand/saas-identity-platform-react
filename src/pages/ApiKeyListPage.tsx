// M05.F01 — tenant-scoped API Key 列表
import { useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  status: "active" | "revoked" | "expired";
  scopes: number;
}

const KEYS: KeyRow[] = [
  { id: "k1", name: "Production Key", prefix: "sk_live", status: "active", scopes: 2 },
];

export function ApiKeyListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  return (
    <div className="space-y-6">
      <PageHeader
        title="API Key"
        description={
          <span>
            租户 <span className="font-mono text-xs">{tenantId?.slice(0, 8)}…</span> 的 API 访问密钥
          </span>
        }
        actions={
          <Button data-fn="M05.F01.I02">
            <Plus className="h-4 w-4 mr-2" />
            创建 Key
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Key 列表 ({KEYS.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>前缀</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {KEYS.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell>
                    <code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                      {k.prefix}…
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{k.scopes} 项</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={k.status} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" data-fn="M05.F01.I04">轮换</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-fn="M05.F01.I03"
                      className="text-red-600 hover:text-red-700"
                    >
                      吊销
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
