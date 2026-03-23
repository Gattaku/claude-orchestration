"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      {isLoading ? "ログアウト中..." : "ログアウト"}
    </button>
  );
}
