interface ThemeDetailPageProps {
  params: Promise<{ themeId: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  // Placeholder: will be populated with actual theme IDs from data source
  return [{ themeId: "placeholder" }];
}

export default async function ThemeDetailPage({
  params,
}: ThemeDetailPageProps) {
  const { themeId } = await params;

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold">Theme Detail</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        テーマ「{themeId}」の詳細がここに表示されます。
      </p>
    </main>
  );
}
