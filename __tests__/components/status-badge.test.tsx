import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/status-badge";

describe("StatusBadge", () => {
  it("renders '進行中' for in-progress status", () => {
    render(<StatusBadge status="in-progress" />);
    expect(screen.getByText("進行中")).toBeDefined();
  });

  it("renders '確認待ち' for awaiting-review status", () => {
    render(<StatusBadge status="awaiting-review" />);
    expect(screen.getByText("確認待ち")).toBeDefined();
  });

  it("renders '完了' for completed status", () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText("完了")).toBeDefined();
  });

  it("renders '保留' for on-hold status", () => {
    render(<StatusBadge status="on-hold" />);
    expect(screen.getByText("保留")).toBeDefined();
  });

  it("applies correct color class for in-progress", () => {
    const { container } = render(<StatusBadge status="in-progress" />);
    const badge = container.querySelector("[data-slot='badge']");
    expect(badge?.className).toContain("bg-status-active");
  });

  it("applies correct color class for awaiting-review", () => {
    const { container } = render(<StatusBadge status="awaiting-review" />);
    const badge = container.querySelector("[data-slot='badge']");
    expect(badge?.className).toContain("bg-status-awaiting");
  });

  it("applies correct color class for completed", () => {
    const { container } = render(<StatusBadge status="completed" />);
    const badge = container.querySelector("[data-slot='badge']");
    expect(badge?.className).toContain("bg-status-completed");
  });

  it("applies correct color class for on-hold", () => {
    const { container } = render(<StatusBadge status="on-hold" />);
    const badge = container.querySelector("[data-slot='badge']");
    expect(badge?.className).toContain("bg-status-on-hold");
  });
});
