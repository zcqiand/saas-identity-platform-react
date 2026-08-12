"use client";

// Tenant Context — current tenant, switch action, JWT holder
//
// 默认租户 = msw 仓 fixtures 的 acme（与 msw 仓的 TENANT_IDS.acme 一致）。
// 首次访问、刷新页面、未登录场景都用这个，避免进入 tenant-scoped 路由
// 时 `useParams().tenantId` 与 `currentTenantId` 不一致。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface TenantContextValue {
  currentTenantId: string | null;
  tenantCode: string | null;
  accessToken: string | null;
  setTenant: (id: string | null, code: string | null, token: string | null) => void;
  clear: () => void;
}

const STORAGE_KEY = "saas.tenant";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_TENANT_CODE = "acme";
const DEFAULT_TENANT_TOKEN = "mock-jwt-default";

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  // 初始 state 用默认租户（acme），避免首次渲染 currentTenantId 为 null 导致
  // 路由 /tenants/:tenantId/users 与 TenantSwitcher 显示不同步
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(DEFAULT_TENANT_ID);
  const [tenantCode, setTenantCode] = useState<string | null>(DEFAULT_TENANT_CODE);
  const [accessToken, setAccessToken] = useState<string | null>(DEFAULT_TENANT_TOKEN);

  useEffect(() => {
    // 优先用 localStorage（用户之前切过），否则把默认租户持久化
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const v = JSON.parse(raw);
        setCurrentTenantId(v.currentTenantId ?? DEFAULT_TENANT_ID);
        setTenantCode(v.tenantCode ?? DEFAULT_TENANT_CODE);
        setAccessToken(v.accessToken ?? DEFAULT_TENANT_TOKEN);
      } catch {
        // 解析失败 → 用默认
      }
    } else {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentTenantId: DEFAULT_TENANT_ID,
          tenantCode: DEFAULT_TENANT_CODE,
          accessToken: DEFAULT_TENANT_TOKEN,
        }),
      );
    }
  }, []);

  const setTenant = useCallback((id: string | null, code: string | null, token: string | null) => {
    setCurrentTenantId(id);
    setTenantCode(code);
    setAccessToken(token);
    if (id && token) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ currentTenantId: id, tenantCode: code, accessToken: token }),
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clear = useCallback(() => setTenant(null, null, null), [setTenant]);

  const value = useMemo<TenantContextValue>(
    () => ({ currentTenantId, tenantCode, accessToken, setTenant, clear }),
    [currentTenantId, tenantCode, accessToken, setTenant, clear],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside <TenantProvider>");
  return ctx;
}
