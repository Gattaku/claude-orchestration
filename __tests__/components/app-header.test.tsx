import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "@/components/app-header";

describe("AppHeader", () => {
  it("renders the product name", () => {
    render(<AppHeader />);
    expect(screen.getByText("AI Dev Dashboard")).toBeDefined();
  });

  it("links to the root page", () => {
    const { container } = render(<AppHeader />);
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/");
  });
});
