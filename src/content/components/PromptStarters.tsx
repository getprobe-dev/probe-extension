import { Button } from '@/components/ui/button';
import { getIconUrl } from '../utils/theme';
import type { FocusedLineRange } from '../../shared/types';

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

  return (
    <div className='flex flex-col items-center justify-center flex-1 p-6 text-center'>
      <img
        src={getIconUrl(48)}
        alt="PRobe"
        width={40}
        height={40}
        className="rounded-xl mb-3"
      />
      <p className='text-sm font-medium text-navy mb-1'>{heading}</p>
      <p className='text-xs text-muted-foreground mb-4'>{subheading}</p>
      <div className='flex flex-wrap justify-center gap-2'>
        {starters.map((text) => (
          <Button
            key={text}
            variant='outline'
            size='sm'
            onClick={() => onSelect(text)}
            className='rounded-full text-xs font-medium h-auto py-1.5 px-3.5 hover:border-mint hover:bg-mint-faint hover:text-navy transition-all'
          >
            {text}
          </Button>
        ))}
      </div>
    </div>
  );
}
