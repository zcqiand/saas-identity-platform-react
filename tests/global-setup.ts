// tests/global-setup.ts — Phase 2 单测真化基座（spec §3.2，lab-react T7 同构，saas 值）。
//
// 顺序：灌种子 → 起真 nextjs :5101（已健康则复用）→ 铸真 JWT → 真服务探针
// → 库身份探针（防「复用了指向别家库的 :5101」）。任何一步失败 fail-fast，
// 不许降级 mock（C 方案本义）。
//
// 与 lab T7 骨架的实测差异（task-10 实施校正）：
//   1. 健康探针：saas-nextjs 真名 /api/health（body {status:"ok"}；src/app/api
//      下还有个 healthz 死副本目录——root app/ 优先，见 dual-app-dir 记忆）。
//   2. 验签闭环：saas-nextjs src/lib/jwt.ts 顶部 `import "server-only"`，
//      裸 node 里动态 import 直接 throw —— lab 的「本地 import 真验签器」路子
//      走不通。改打真服务双探针：GET /api/v1/me 带 Bearer 200（真验签器吃下
//      我们铸的 token = secret/iss/aud/claim 形状全对）+ 无 Bearer 恒 401
//      （ADR-0019 guard 语义在真服务上活着的证据）。
//   3. JWT 键名是 saas 家族自己的：JWT_SIGNING_KEY / JWT_ISSUER / JWT_AUDIENCE
//      （非 lab 的 LAB_JWT_*）。claim 形状照 src/lib/jwt.ts JwtClaims 实测：
//      { sub（user id）, tenant_id（tenant id）, iss, aud, exp }；tenant-scoped
//      端点用路径 :tenantId 与 claim 比对（tenant-guard.ts），故 token 的
//      tenant_id 锚 seeds/tenant.json 首行（acme），sub 锚 sys_user.json alice。
//   4. 库身份探针（saas 特有）：:5101 是家族常驻 dev 端口，可能存在一个指向
//      别的库（如 saas_dev）的健康进程。种子直灌目标库后，往目标库插一行
//      探针菜单、看服务能否读到——读不到 = 服务与目标库不同源，fail-fast
//      （绝不反查端口杀用户进程，也绝不顺着错误库跑测试）。探针行即插即删。
//
// 进程治理（Phase 2 裁定，同 lab）：拉起的 nextjs 留活不杀——dev 迭代复用；
// PID 记到 $TMPDIR/saas-react-test-nextjs.pid 供人工清理；绝不反查端口杀树。
import { execSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REACT_ROOT = resolve(HERE, "..");
const SHARED = resolve(REACT_ROOT, "../saas-identity-platform-shared");
const NEXTJS = resolve(REACT_ROOT, "../saas-identity-platform-nextjs");
const BASE = "http://localhost:5101";
const NEXTJS_ENV_FILE = resolve(NEXTJS, ".env.local");

/** env 读取：process.env 优先（CI 注入），回落 sibling .env.local；两头皆无 fail-fast。 */
const readKey = (key: string): string => {
  const fromEnv = process.env[key];
  if (fromEnv) return fromEnv;
  const line = readFileSync(NEXTJS_ENV_FILE, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  if (!line)
    throw new Error(
      `fail-fast: ${key} 未在 process.env / ${NEXTJS_ENV_FILE} 声明（禁兜底，ADR-0019）`,
    );
  return line
    .slice(key.length + 1)
    .trim()
    .replace(/^"(.*)"$/, "$1")
    .replace(/^'(.*)'$/, "$1");
};

/** /api/health 健康探针：200 且 body.status==="ok" 才算过。 */
async function healthOk(timeoutMs = 5_000): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return false;
    const body = (await res.json().catch(() => null)) as { status?: string } | null;
    return body?.status === "ok";
  } catch {
    return false;
  }
}

/** 轮询直至 deadline（毫秒），每秒一次。 */
async function waitFor(fn: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 1_000));
  }
  return fn();
}

/**
 * 库身份探针：往 DATABASE_URL 指向的库插一行探针菜单（title 随机），
 * 再看 :5101 的 /api/v1/clients/lab-management/menus 能否读到它。
 * 读不到 = 服务连的不是目标库（如常驻 dev 进程还挂在 saas_dev 上）。
 */
async function serverServesTargetDb(
  pgModule: {
    Client: new (opts: { connectionString: string }) => {
      connect: () => Promise<void>;
      query: (sql: string, vals: unknown[]) => Promise<{ rowCount: number | null }>;
      end: () => Promise<void>;
    };
  },
  dbUrl: string,
  token: string,
): Promise<{ ok: boolean; detail: string }> {
  const markerTitle = `__p2_probe_${randomUUID().slice(0, 8)}__`;
  const client = new pgModule.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO sys_menu (id, client_id, parent_id, title, type, path, sort_order, status, created_at)
       VALUES ($1, 'lab-management', '00000000-0000-0000-0000-000000000000', $2, 2, null, 0, 1, now())`,
      [randomUUID(), markerTitle],
    );
    try {
      const res = await fetch(`${BASE}/api/v1/clients/lab-management/menus`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return { ok: false, detail: `menus 探针 HTTP ${res.status}` };
      const menus = (await res.json()) as Array<{ title?: string }>;
      const visible = menus.some((m) => m.title === markerTitle);
      return visible
        ? { ok: true, detail: "服务与目标库同源" }
        : { ok: false, detail: "探针菜单在目标库但服务读不到（:5101 连的是别的库）" };
    } finally {
      await client.query(`DELETE FROM sys_menu WHERE title = $1`, [markerTitle]);
    }
  } finally {
    await client.end();
  }
}

export default async function ({
  provide,
}: {
  provide: (key: string, value: unknown) => void;
}): Promise<void> {
  const dbUrl = readKey("DATABASE_URL");

  // 1. 种子（saas 语义：TRUNCATE 后全量重灌——配置型数据全量重灌才是正确幂等，
  //    见 shared/scripts/seed-db.mjs 头注；连 nextjs 同一库，seeds/*.json 是权威源）
  console.log("[global-setup] 1/5 灌种子（shared/scripts/seed-db.mjs → 目标库）…");
  execSync("node scripts/seed-db.mjs", {
    cwd: SHARED,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: dbUrl },
  });

  // 2. nextjs :5101——已健康则复用（dev 调试现场），否则拉起 own 进程
  let selfSpawned = false;
  if (!(await healthOk())) {
    console.log("[global-setup] 2/5 :5101 不健康，拉起 own nextjs dev 进程…");
    selfSpawned = true;
    const child = spawn("npm", ["run", "dev"], {
      cwd: NEXTJS,
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: dbUrl },
      shell: true,
      detached: true,
    });
    if (child.pid) {
      writeFileSync(resolve(tmpdir(), "saas-react-test-nextjs.pid"), String(child.pid));
    }
    if (!(await waitFor(healthOk, 120_000))) {
      throw new Error(`fail-fast: nextjs :5101 /api/health 探活超时（PID ${child.pid ?? "?"}）`);
    }
  } else {
    console.log("[global-setup] 2/5 :5101 已健康，复用现有进程（不重启不杀树）");
  }

  // 3. 铸真 JWT（HS256，claim 形状对齐 saas-nextjs src/lib/jwt.ts JwtClaims：
  //    { sub, tenant_id, iss, aud, exp }；sub/tenant_id 锚 shared 种子行——
  //    tenant-scoped 端点靠 tenant_id 与路径 :tenantId 比对放行）
  const tenantsSeed = JSON.parse(
    readFileSync(resolve(SHARED, "seeds/tenant.json"), "utf8"),
  ) as Array<{ id: string }>;
  const usersSeed = JSON.parse(
    readFileSync(resolve(SHARED, "seeds/sys_user.json"), "utf8"),
  ) as Array<{ id: string; username: string }>;
  const acme = tenantsSeed[0];
  const alice = usersSeed.find((u) => u.username === "alice");
  if (!acme || !alice) throw new Error("fail-fast: seeds 缺 acme/alice 行——种子契约漂移");

  const secretText = readKey("JWT_SIGNING_KEY");
  const issuer = readKey("JWT_ISSUER");
  const audience = readKey("JWT_AUDIENCE");
  const { SignJWT } = await import("jose");
  const token = await new SignJWT({ tenant_id: acme.id })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(alice.id)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(new TextEncoder().encode(secretText));
  console.log("[global-setup] 3/5 真 JWT 铸造完成（sub=alice, tenant_id=acme）");

  // 4. 真服务验签闭环（saas-nextjs jwt.ts 是 server-only，无法本地 import——
  //    打真服务双探针）：
  //    a) GET /api/v1/me 带 Bearer → 200：服务端真 verifyToken 吃下铸 token；
  //    b) 无 Bearer → 401：guard 语义活着（ADR-0019 负探针）。
  const me = await fetch(`${BASE}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!me.ok) {
    throw new Error(
      `fail-fast: GET /api/v1/me 被拒（${me.status}）——JWT_SIGNING_KEY/JWT_ISSUER/JWT_AUDIENCE 与 ：5101 服务不一致`,
    );
  }
  const anon = await fetch(`${BASE}/api/v1/me`, { signal: AbortSignal.timeout(30_000) });
  if (anon.status !== 401) {
    throw new Error(
      `fail-fast: GET /api/v1/me 无 Bearer 期望 401（ADR-0019），实得 ${anon.status}——guard 语义漂移`,
    );
  }
  console.log("[global-setup] 4/5 真服务验签探针通过（/me 200 + 无 Bearer 401）");

  // 5. 库身份探针：健康 ≠ 连的是目标库。自拉进程必然同源；复用进程必须实证。
  const requireFromShared = createRequire(resolve(SHARED, "package.json"));
  const pgModule = requireFromShared("pg");
  const identity = await serverServesTargetDb(pgModule, dbUrl, token);
  if (!identity.ok) {
    throw new Error(
      `fail-fast: :5101 与 DATABASE_URL 目标库不同源（${identity.detail}）。` +
        `自拉进程=${selfSpawned}。请让 :5101 指向目标库或停掉它后重跑——` +
        `绝不顺着一个连别家库的服务跑测试。`,
    );
  }
  console.log(`[global-setup] 5/5 库身份探针通过（${identity.detail}）`);

  // 双通道供测试消费：provide()（vitest inject）+ process.env（forks pool 子进程继承）
  provide("TEST_TOKEN", token);
  process.env.TEST_TOKEN = token;
}
