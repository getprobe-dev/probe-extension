import { createContext, useContext } from "react";
import type { ReviewPendingComment } from "../../shared/types";

export interface ReviewContextValue {
  prOwner: string;
  prRepo: string;
  prNumber: number;
  focusedFile: string | null;
  fileLine: number;
  fileSide: "LEFT" | "RIGHT";
  onAddToReview: (comment: ReviewPendingComment) => void;
}

export const ReviewContext = createContext<ReviewContextValue | null>(null);

export function useReviewContext(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error("useReviewContext must be used inside ReviewContext.Provider");
  return ctx;
}
