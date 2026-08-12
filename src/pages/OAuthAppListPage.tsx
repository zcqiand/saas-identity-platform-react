// M04.F01 — 平台级 OAuth 应用列表
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";

interface AppRow {
  id: string;
  clientId: string;
  name: string;
  scopes: number;
  isFirstParty: boolean;
}

const APPS: AppRow[] = [
  { id: "a1", clientId: "demo-client-id", name: "Demo Integration", scopes: 3, isFirstParty: true },
];

export function OAuthAppListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="OAuth2 应用"
        description="管理平台注册的 OAuth2 客户端（用于租户授权 scope 接入）"
        actions={
          <Button data-fn="M04.F01.I02">
            <Plus className="h-4 w-4 mr-2" />
            注册应用
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>应用列表 ({APPS.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>类型</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {APPS.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.clientId}</TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.scopes} 项</Badge>
                  </TableCell>
                  <TableCell>
                    {a.isFirstParty ? <Badge>第一方</Badge> : <Badge variant="secondary">第三方</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" data-fn="M04.F01.I04">编辑</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-fn="M04.F01.I05"
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
