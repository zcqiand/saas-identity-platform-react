// 统一加载中：居中放旋转图标 + "加载中…" 文本。
// 列表页缺 loading 态的（如 MenuTreePage）和路由切换 fallback 都走这里。
// 禁止各页手写"加载中…"或裸 spinner。

import { LoaderCircle } from "lucide-react";

export function PageLoading() {
  return (
    <div
      className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 text-sm text-slate-400"
      role="status"
      aria-live="polite"
      data-testid="page-loading"
    >
      <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" />
      <span>加载中…</span>
    </div>
  );
}
