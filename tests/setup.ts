// vitest setup — RTL matchers + jsdom cleanup + 真链路 axios 拦截器。
//
// msw 剔除 Phase 2（Task 10）：此前的 vi.mock 墙（8 个 endpoint 模块 + barrel
// 兜底 mock，曾覆盖整个 orval api-client 表面）已全部拆除——测试直连真
// nextjs :5101（globalSetup 保证服务/种子/JWT 在位）。本文件只做三件事：
//   1. jest-dom matchers；
//   2. installHttpClient 拦截器装一次（baseURL 取 .env.test 的
//      VITE_API_BASE_URL=:5101，Authorization 取 globalSetup 铸的
//      TEST_TOKEN——main.tsx bootstrap 在测试里不跑，这里接桥）；
//   3. afterEach：RTL cleanup + localStorage 复位。
//      （localStorage 里的会话由各测试 beforeEach 调 installRealChain() 写回。）
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { installHttpClient } from "@/api/http-client";
import { testToken } from "./helpers/real-chain";

installHttpClient(() => testToken());

afterEach(() => {
  cleanup();
  localStorage.clear();
});
