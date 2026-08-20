// Test helper: re-export providers to keep test imports short
//
// ADR-0014：BackendProvider 已删除（运行时不再切后端）。保留 Provider 仅做
// TenantProvider / SelectionProvider 的统一出口。
export { TenantProvider, useTenant } from "../src/state/tenant-context";
export { SelectionProvider, useSelection } from "../src/state/selection-context";