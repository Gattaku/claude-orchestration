import { getAllThemes, getAwaitingReviewThemes } from "@/lib/data/themes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AwaitingReviewBanner } from "@/components/awaiting-review-banner";
import { ThemeList } from "@/components/theme-list";

export const revalidate = 60;

export default async function OverviewPage() {
  const [allThemes, awaitingThemes, supabase] = await Promise.all([
    getAllThemes(),
    getAwaitingReviewThemes(),
    createServerSupabaseClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="mt-6 space-y-6">
        <AwaitingReviewBanner
          themes={awaitingThemes}
          isAuthenticated={!!user}
        />
        <ThemeList items={allThemes} />
      </div>
    </main>
  );
}
