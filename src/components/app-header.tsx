import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <Link href="/" className="text-lg font-semibold text-foreground hover:opacity-80 transition-opacity">
        AI Dev Dashboard
      </Link>
    </header>
  );
}
