import { getIconUrl } from '../utils/theme';
import type { FocusedLineRange } from '../../shared/types';
import { Sparkles, FileSearch, Code2 } from 'lucide-react';

interface PromptStartersProps {
  focusedFile: string | null;
  focusedLineRange: FocusedLineRange | null;
  onSelect: (prompt: string) => void;
}

const WHOLE_PR_STARTERS = [
  'Summarize this PR',
  'What are the most important changes?',
  'Are there any potential issues?',
  'What does this PR not cover?',
];

const FILE_STARTERS = [
  'Explain the changes in this file',
  'Any bugs or edge cases here?',
  'How does this fit into the broader PR?',
];

const LINE_STARTERS = [
  'What does this code do?',
  'Any bugs or edge cases in these lines?',
  'How could this be improved?',
  'Explain the intent behind this change',
];

export function PromptStarters({
  focusedFile,
  focusedLineRange,
  onSelect,
}: PromptStartersProps) {
  const starters = focusedLineRange
    ? LINE_STARTERS
    : focusedFile
      ? FILE_STARTERS
      : WHOLE_PR_STARTERS;

  const heading = focusedLineRange
    ? 'Chat about these lines'
    : focusedFile
      ? 'Chat about this file'
      : 'Chat with this PR';

  const subheading = focusedLineRange
    ? 'Probe the selected code, logic, or potential issues.'
    : focusedFile
      ? 'Probe the changes, logic, or potential issues.'
      : 'Probe questions about the changes, understand the intent, or spot issues.';

  const Icon = focusedLineRange ? Code2 : focusedFile ? FileSearch : Sparkles;

  return (
    <div className='flex flex-col items-center justify-center flex-1 p-6'>
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-mint/15 blur-xl scale-150" />
        <img
          src={getIconUrl(48)}
          alt="PRobe"
          width={44}
          height={44}
          className="relative rounded-xl ring-1 ring-black/5"
        />
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="size-3.5 text-primary" />
        <p className='text-sm font-semibold tracking-tight text-foreground'>{heading}</p>
      </div>
      <p className='text-xs text-muted-foreground mb-5 max-w-[260px] text-center leading-relaxed'>{subheading}</p>
      <div className='flex flex-col gap-1.5 w-full max-w-[280px]'>
        {starters.map((text) => (
          <button
            key={text}
            onClick={() => onSelect(text)}
            className='starter-card text-left w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[0.8rem] text-foreground/80 hover:text-foreground cursor-pointer'
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
