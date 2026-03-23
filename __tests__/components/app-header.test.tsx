import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the Supabase server client
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

// Mock the LogoutButton as a simple component (it's a client component)
vi.mock("@/components/logout-button", () => ({
  LogoutButton: () => <button>ログアウト</button>,
}));

// We need to import the component after mocks are set up
import { AppHeader } from "@/components/app-header";

describe("AppHeader", () => {
  it("renders the product name when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const Component = await AppHeader();
    render(Component);
    expect(screen.getByText("AI Dev Dashboard")).toBeDefined();
  });

  it("links to the root page", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const Component = await AppHeader();
    const { container } = render(Component);
    const link = container.querySelector("a[href='/']");
    expect(link).toBeDefined();
    expect(link?.textContent).toContain("AI Dev Dashboard");
  });

  it("shows login link when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const Component = await AppHeader();
    render(Component);
    expect(screen.getByText("ログイン")).toBeDefined();
  });

  it("shows user email and logout button when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
      error: null,
    });

    const Component = await AppHeader();
    render(Component);
    expect(screen.getByText("test@example.com")).toBeDefined();
    expect(screen.getByText("ログアウト")).toBeDefined();
  });
});
