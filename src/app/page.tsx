import { getAllThemes, getAwaitingReviewThemes } from "@/lib/data/themes";
import { AwaitingReviewBanner } from "@/components/awaiting-review-banner";
import { ThemeList } from "@/components/theme-list";

export default async function OverviewPage() {
  const [allThemes, awaitingThemes] = await Promise.all([
    getAllThemes(),
    getAwaitingReviewThemes(),
  ]);

  return (
    <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="mt-6 space-y-6">
        <AwaitingReviewBanner themes={awaitingThemes} />
        <ThemeList items={allThemes} />
      </div>
    </main>
  );
}
