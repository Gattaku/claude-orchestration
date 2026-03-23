import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        お探しのページは見つかりませんでした。
      </p>
      <Link
        href="/"
        className="mt-4 text-sm font-medium text-status-active underline underline-offset-4 hover:opacity-80"
      >
        オーバービューに戻る
      </Link>
    </main>
  );
}
