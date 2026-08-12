// M02.F01.I01 — tenant-scoped 角色列表
import { useParams } from "react-router-dom";

interface RoleRow {
  id: string;
  code: string;
  name: string;
}

export function RoleListPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const roles: RoleRow[] = [
    { id: "r1", code: "admin", name: "管理员" },
    { id: "r2", code: "member", name: "普通成员" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>角色权限（M02.F01）— tenant {tenantId?.slice(0, 8)}</h1>
      <button data-fn="M02.F01.I02" style={{ marginBottom: 12 }}>
        + 新建角色
      </button>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Code</th>
            <th>名称</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id}>
              <td>{r.code}</td>
              <td>{r.name}</td>
              <td>
                <button data-fn="M02.F02.I01">权限矩阵</button>
                <button data-fn="M02.F01.I04" style={{ marginLeft: 8 }}>
                  编辑
                </button>
                <button data-fn="M02.F01.I05" style={{ marginLeft: 8 }}>
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
