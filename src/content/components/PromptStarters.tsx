import type { FocusedLineRange } from "../../shared/types";

interface PromptStartersProps {
  focusedFile: string | null;
  focusedLineRange: FocusedLineRange | null;
  onSelect: (prompt: string) => void;
}

const WHOLE_PR_STARTERS = [
  "Summarize this PR",
  "What are the most important changes?",
  "Are there any potential issues?",
  "What does this PR not cover?",
];

const FILE_STARTERS = [
  "Explain the changes in this file",
  "Any bugs or edge cases here?",
  "How does this fit into the broader PR?",
];

const LINE_STARTERS = [
  "What does this code do?",
  "Any bugs or edge cases in these lines?",
  "How could this be improved?",
  "Explain the intent behind this change",
];

export function PromptStarters({ focusedFile, focusedLineRange, onSelect }: PromptStartersProps) {
  const starters = focusedLineRange
    ? LINE_STARTERS
    : focusedFile
      ? FILE_STARTERS
      : WHOLE_PR_STARTERS;

  const heading = focusedLineRange
    ? "Chat about these lines"
    : focusedFile
      ? "Chat about this file"
      : "Chat with this PR";

  const subheading = focusedLineRange
    ? "Ask about the selected code, logic, or potential issues."
    : focusedFile
      ? "Ask about the changes, logic, or potential issues."
      : "Ask questions about the changes, understand the intent, or spot issues.";

  return (
    <div className="prs-flex prs-flex-col prs-items-center prs-justify-center prs-flex-1 prs-p-6 prs-text-center">
      <div className="prs-w-12 prs-h-12 prs-rounded-full prs-bg-teal-100 prs-flex prs-items-center prs-justify-center prs-mb-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </div>
      <p className="prs-text-sm prs-font-medium prs-text-neutral-700 prs-mb-1">
        {heading}
      </p>
      <p className="prs-text-xs prs-text-neutral-400 prs-mb-3">
        {subheading}
      </p>
      <div className="prs-flex prs-flex-wrap prs-justify-center prs-gap-2">
        {starters.map((text) => (
          <button
            key={text}
            onClick={() => onSelect(text)}
            className="prs-prompt-starter"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
