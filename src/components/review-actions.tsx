"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveTheme, rejectTheme } from "@/app/actions/review";

interface ReviewActionsProps {
  themeId: string;
  isAuthenticated: boolean;
}

export function ReviewActions({ themeId, isAuthenticated }: ReviewActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [comment, setComment] = useState("");
  const router = useRouter();

  if (!isAuthenticated) {
    return null;
  }

  const handleApprove = async () => {
    setIsLoading(true);
    setError(null);
    const result = await approveTheme(themeId);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const handleReject = async () => {
    setIsLoading(true);
    setError(null);
    const result = await rejectTheme(themeId, comment || undefined);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-medium">レビューアクション</h3>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {!showRejectForm ? (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "処理中..." : "承認（Go）"}
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={isLoading}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            差し戻し（No-Go）
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="コメント（任意、最大1000文字）"
            maxLength={1000}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={isLoading}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "処理中..." : "差し戻しを確定"}
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false);
                setComment("");
              }}
              disabled={isLoading}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
