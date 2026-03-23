import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export async function AppHeader() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
      <Link
        href="/"
        className="text-lg font-semibold text-foreground hover:opacity-80 transition-opacity"
      >
        AI Dev Dashboard
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <LogoutButton />
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ログイン
          </Link>
        )}
      </div>
    </header>
  );
}
