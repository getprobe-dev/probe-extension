import { ArrowLeft, X, ScanEye } from "lucide-react";
import { getIconUrl } from "../utils/iconUtils";
import { ReviewQueue } from "./ReviewQueue";
import type { PRContext, ReviewPendingComment } from "../../shared/types";

interface ChatHeaderProps {
  prContext: PRContext | null;
  showInspector: boolean;
  systemPrompt: string;
  pendingReview: ReviewPendingComment[];
  isSelfReview: boolean;
  hasMessages: boolean;
  onToggleInspector: () => void;
  onClear: () => void;
  onClose: () => void;
  onClearReview: () => void;
  onRemoveFromReview: (index: number) => void;
}

export function ChatHeader({
  prContext,
  showInspector,
  systemPrompt,
  pendingReview,
  isSelfReview,
  hasMessages,
  onToggleInspector,
  onClear,
  onClose,
  onClearReview,
  onRemoveFromReview,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 h-12 bg-[#1a2e2b] text-white shrink-0 border-b border-[#5eead4]/10">
      <div className="flex items-center gap-2 min-w-0">
        {hasMessages && (
          <button onClick={onClear} className="header-btn shrink-0" title="New chat" type="button" aria-label="New chat">
            <ArrowLeft className="size-4" />
          </button>
        )}
        <img
          src={getIconUrl(48)}
          alt="PRobe"
          width={22}
          height={22}
          className="rounded-md shrink-0"
        />
        <span className="text-sm font-bold tracking-tight text-white">PRobe</span>
        {prContext && (
          <span className="text-xs font-medium text-white/40">#{prContext.number}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {systemPrompt && (
          <button
            onClick={onToggleInspector}
            className={`header-btn ${showInspector ? "text-mint" : ""}`}
            title="X-Ray"
            type="button"
            aria-label="Toggle X-Ray inspector"
          >
            <ScanEye className="size-4" />
          </button>
        )}
        {prContext && (
          <ReviewQueue
            pending={pendingReview}
            owner={prContext.owner}
            repo={prContext.repo}
            number={prContext.number}
            isSelfReview={isSelfReview}
            onClear={onClearReview}
            onRemove={onRemoveFromReview}
          />
        )}
        <button
          onClick={onClose}
          className="header-btn header-btn-close"
          title="Close panel"
          type="button"
          aria-label="Close panel"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
