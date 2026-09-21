// Trigger shared codegen (emit:openapi only) then run local orval to generate
// src/api/endpoints/{endpoints.ts,endpoints.schemas.ts} from the resulting OpenAPI.yaml.
//
// Architecture: shared 仓 is now a pure contract source (TypeSpec → OpenAPI.yaml).
// Language-specific clients are generated per consuming project.
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = resolve(import.meta.dirname, "..");
const sharedDir = resolve(root, "../saas-identity-platform-shared");
const openapi = resolve(sharedDir, "generated/openapi/openapi.yaml");
const outDir = resolve(root, "src/api/endpoints");

console.log("[gen-shared] step 1/2 — shared: emit OpenAPI.yaml...");
execSync("npm run emit:openapi", { cwd: sharedDir, stdio: "inherit" });

if (!existsSync(openapi)) {
  throw new Error(`[gen-shared] missing openapi.yaml at ${openapi}`);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

console.log("[gen-shared] step 2/2 — react: orval → src/api/endpoints/...");
execSync("npx orval", { cwd: root, stdio: "inherit" });

console.log("[gen-shared] OK");

// ADR-0026 §2: 写 last-gen-shared.json marker（API 类别，react 无 DB sync）。
// 失败不阻塞 gen-shared —— staleness 是 warning（V1 档）不是 build blocker。
try {
  const markerPath = resolve(root, ".state/last-gen-shared.json");
  mkdirSync(resolve(root, ".state"), { recursive: true });
  const sharedSha = execSync("git rev-parse HEAD", { cwd: sharedDir, encoding: "utf-8" }).trim();

  let marker: Record<string, string> = {};
  if (existsSync(markerPath)) {
    try {
      marker = JSON.parse(readFileSync(markerPath, "utf-8"));
    } catch {
      marker = {};
    }
  }

  // 5.77（2026-09-21 人裁立项）：同 sha 零写入——api_synced_sha 与现存 marker 相同 →
  // 整个 marker 文件零写入（时间戳/mtime 不动，字节级幂等）；sha 真变才全量写。
  if (marker.api_synced_sha === sharedSha) {
    console.log(
      `[gen-shared]    ADR-0026 marker sha 未变，零写入（5.77 同 sha 不刷时间戳）: ${markerPath}`,
    );
  } else {
    marker.api_synced_sha = sharedSha;
    marker.api_synced_at = new Date().toISOString();
    marker.api_synced_cmd = "gen-shared.ts";

    // shared_sha 取最近一次同步：ISO-8601 UTC 时间戳字典序==时间序（5.21 修复，勿 sort sha）。
    const entries: Array<[string, string]> = (["api_synced", "db_synced"] as const)
      .map((k) => [String(marker[`${k}_at`] ?? ""), String(marker[`${k}_sha`] ?? "")] as [string, string])
      .filter(([, sha]) => sha !== "");
    marker.shared_sha = entries.length
      ? entries.sort((a, b) => a[0].localeCompare(b[0])).pop()![1]
      : sharedSha;
    marker.consumer_repo = resolve(root).split(/[\\/]/).pop()!;

    writeFileSync(markerPath, JSON.stringify(marker, null, 2) + "\n", "utf-8");
    console.log(
      `[gen-shared]    ADR-0026 marker 已落盘: ${markerPath} (shared HEAD ${sharedSha.slice(0, 7)})`,
    );
  }
} catch (err) {
  console.warn(
    `[gen-shared]    WARN: marker 写失败（${err instanceof Error ? err.message : err}）—— staleness 将报 UNKNOWN`,
  );
}