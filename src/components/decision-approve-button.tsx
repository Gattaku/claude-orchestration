"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveDecision } from "@/app/actions/review";
import { CheckCircle } from "lucide-react";

interface DecisionApproveButtonProps {
  decisionId: string;
}

export function DecisionApproveButton({ decisionId }: DecisionApproveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    setIsLoading(true);
    setError(null);
    const result = await approveDecision(decisionId);
    if (result.success) {
      setIsApproved(true);
      router.refresh();
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  if (isApproved) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        確定済み
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleApprove}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCircle className="h-3.5 w-3.5" />
        {isLoading ? "処理中..." : "確定する"}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
