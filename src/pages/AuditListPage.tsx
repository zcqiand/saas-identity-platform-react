// M06.F01.I01 — tenant-scoped 审计日志列表
import { useParams } from "react-router-dom";

interface AuditRow {
  id: string;
  action: string;
  actorUserId?: string;
  occurredAt: string;
}

export function AuditListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const events: AuditRow[] = [
    { id: "e1", action: "user_created", actorUserId: "u1", occurredAt: "2026-08-12T10:00:00Z" },
    { id: "e2", action: "login_success", actorUserId: "u2", occurredAt: "2026-08-12T11:30:00Z" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>审计日志（M06.F01）— tenant {tenantId?.slice(0, 8)}</h1>
      <button data-fn="M06.F01.I03" style={{ marginBottom: 12 }}>
        导出 CSV
      </button>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>时间</th>
            <th>动作</th>
            <th>操作者</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>{e.occurredAt}</td>
              <td>{e.action}</td>
              <td>{e.actorUserId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
