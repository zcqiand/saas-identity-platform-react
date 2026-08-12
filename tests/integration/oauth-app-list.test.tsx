// M04.F01 — 平台级 OAuth 应用列表
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OAuthAppListPage } from "../../src/pages/OAuthAppListPage";

describe("M04.F01 OAuth 应用（平台级）", () => {
  it("渲染应用列表，注册按钮挂 data-fn=M04.F01.I02", () => {
    render(
      <MemoryRouter>
        <OAuthAppListPage />
      </MemoryRouter>,
    );
    const btn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M04.F01.I02");
    expect(btn).toBeTruthy();
  });
});
