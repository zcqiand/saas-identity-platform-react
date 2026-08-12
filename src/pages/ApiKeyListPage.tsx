// M05.F01 — tenant-scoped API Key 生命周期（创建 / 吊销 / 轮换）

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  tenantApiKeysCreateApiKey,
  tenantApiKeysListApiKeys,
  tenantApiKeysRevokeApiKey,
  tenantApiKeysRotateApiKey,
} from "@/api/endpoints/endpoints";
import type { ApiKey, CreateApiKeyRequest } from "@/api/endpoints/endpoints.schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { CrudDialog, type FieldDef } from "@/components/app/crud-dialog";
import { toApiError } from "@/api/http-client";
import { toast } from "sonner";

const FIELDS: FieldDef[] = [
  { name: "name", label: "名称", required: true, placeholder: "Production Key" },
  { name: "scopesText", label: "Scopes（逗号分隔）", placeholder: "users.read, users.write" },
];

export function ApiKeyListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["tenantApiKeysListApiKeys", tenantId],
    queryFn: async () => (await tenantApiKeysListApiKeys(tenantId!)).data.items,
    enabled: !!tenantId,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateApiKeyRequest) => tenantApiKeysCreateApiKey(tenantId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantApiKeysListApiKeys", tenantId] });
      toast.success("API Key 已创建（请妥善保管 secret，仅展示一次）");
    },
    onError: (err) => toast.error(`创建失败：${toApiError(err).message}`),
  });

  const revokeMut = useMutation({
    mutationFn: (keyId: string) => tenantApiKeysRevokeApiKey(tenantId!, keyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantApiKeysListApiKeys", tenantId] });
      toast.success("API Key 已吊销");
    },
    onError: (err) => toast.error(`吊销失败：${toApiError(err).message}`),
  });

  const rotateMut = useMutation({
    mutationFn: (keyId: string) => tenantApiKeysRotateApiKey(tenantId!, keyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenantApiKeysListApiKeys", tenantId] });
      toast.success("API Key 已轮换");
    },
    onError: (err) => toast.error(`轮换失败：${toApiError(err).message}`),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [rotateTarget, setRotateTarget] = useState<ApiKey | null>(null);

  const keys = list.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Key"
        description={`租户 ${tenantId?.slice(0, 8) ?? "—"} 的 API 访问密钥`}
        actions={
          <Button onClick={() => setCreateOpen(true)} data-fn="M05.F01.I02">
            创建 Key
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Key 列表 ({keys.length})</CardTitle>
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
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell>
                    <code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                      {k.prefix}…
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{k.scopes.length} 项</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={k.status as "active" | "revoked" | "expired"} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-fn="M05.F01.I04"
                      onClick={() => setRotateTarget(k)}
                      disabled={k.status === "revoked"}
                    >
                      轮换
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-fn="M05.F01.I03"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setRevokeTarget(k)}
                      disabled={k.status === "revoked"}
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

      <CrudDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="创建 API Key"
        description="Secret 仅在创建时返回一次，请妥善保存。"
        fields={FIELDS}
        submitText="创建"
        loading={createMut.isPending}
        onSubmit={async (values) => {
          await createMut.mutateAsync({
            name: String(values.name ?? "").trim(),
            scopes: values.scopesText
              ? String(values.scopesText).split(",").map((s) => s.trim()).filter(Boolean)
              : [],
          } as CreateApiKeyRequest);
          setCreateOpen(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title={`吊销 API Key「${revokeTarget?.name ?? ""}」？`}
        description="吊销后该 Key 立即失效，所有用此 Key 调用的请求将被拒绝。"
        confirmText="吊销"
        destructive
        loading={revokeMut.isPending}
        onConfirm={async () => {
          if (!revokeTarget) return;
          await revokeMut.mutateAsync(revokeTarget.id);
          setRevokeTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(rotateTarget)}
        onOpenChange={(o) => !o && setRotateTarget(null)}
        title={`轮换 API Key「${rotateTarget?.name ?? ""}」？`}
        description="轮换将生成新 Key 并自动吊销旧 Key。Secret 仅在轮换时返回一次。"
        confirmText="轮换"
        loading={rotateMut.isPending}
        onConfirm={async () => {
          if (!rotateTarget) return;
          await rotateMut.mutateAsync(rotateTarget.id);
          setRotateTarget(null);
        }}
      />
    </div>
  );
}