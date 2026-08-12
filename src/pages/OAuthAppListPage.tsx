// M04.F01.I01 — 平台级 OAuth 应用列表
interface AppRow {
  id: string;
  clientId: string;
  name: string;
}

export function OAuthAppListPage() {
  const apps: AppRow[] = [{ id: "a1", clientId: "demo-client", name: "Demo App" }];

  return (
    <div style={{ padding: 24 }}>
      <h1>OAuth2 应用（M04.F01）</h1>
      <button data-fn="M04.F01.I02" style={{ marginBottom: 12 }}>
        + 注册应用
      </button>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Client ID</th>
            <th>名称</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((a) => (
            <tr key={a.id}>
              <td>{a.clientId}</td>
              <td>{a.name}</td>
              <td>
                <button data-fn="M04.F01.I04">编辑</button>
                <button data-fn="M04.F01.I05" style={{ marginLeft: 8 }}>
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
