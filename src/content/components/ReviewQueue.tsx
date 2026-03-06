import { Button } from '@/components/ui/button';
import { Check, FileText, X } from 'lucide-react';
import { useState } from 'react';
import type {
  ReviewPendingComment,
  SubmitReviewRequest,
  SubmitReviewResponse,
} from '../../shared/types';

interface ReviewQueueProps {
  pending: ReviewPendingComment[];
  owner: string;
  repo: string;
  number: number;
  onClear: () => void;
  onRemove: (index: number) => void;
}

type SubmitState = 'idle' | 'submitting' | 'submitted' | 'error';
type ReviewEvent = 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';

export function ReviewQueue({
  pending,
  owner,
  repo,
  number,
  onClear,
  onRemove,
}: ReviewQueueProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [body, setBody] = useState('');
  const [event, setEvent] = useState<ReviewEvent>('COMMENT');
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState('');

  if (pending.length === 0) return null;

  const handleSubmit = async () => {
    if (state === 'submitting') return;
    setState('submitting');
    setError('');

    const msg: SubmitReviewRequest = {
      type: 'submit-review',
      owner,
      repo,
      number,
      body: body.trim(),
      event,
      comments: pending.map((c) => ({
        path: c.path,
        body: c.body,
        line: c.line,
        side: c.side,
      })),
    };

    try {
      const res = await new Promise<SubmitReviewResponse>((resolve, reject) => {
        try {
          chrome.runtime.sendMessage(msg, (r: SubmitReviewResponse) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(r);
          });
        } catch {
          reject(
            new Error(
              'Extension context invalidated. Please refresh the page.',
            ),
          );
        }
      });

      if (res.ok) {
        setState('submitted');
        setTimeout(() => {
          onClear();
          setIsOpen(false);
          setState('idle');
          setBody('');
        }, 2000);
      } else {
        setState('error');
        setError(res.error ?? 'Failed to submit review');
      }
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/15 bg-white/10 text-white/80 text-[0.68rem] font-semibold cursor-pointer transition-all hover:bg-white/15 hover:text-white leading-none'
        title={`${pending.length} pending review comment${pending.length > 1 ? 's' : ''}`}
      >
        <FileText className='size-3' />
        <span>{pending.length}</span>
      </button>

      {isOpen && (
        <div className='review-dialog animate-fade-in'>
          <div className='flex items-center justify-between p-3 border-b border-border/50'>
            <span className='text-sm font-semibold text-foreground'>
              {state === 'submitted' ? 'Review submitted' : 'Submit Review'}
            </span>
            <Button
              variant='ghost'
              size='icon-xs'
              onClick={() => setIsOpen(false)}
              className='text-muted-foreground hover:text-foreground'
              title='Close'
            >
              <X className='size-3' />
            </Button>
          </div>

          {state === 'submitted' ? (
            <div className='flex items-center gap-1.5 p-4 text-sm font-medium text-emerald-600'>
              <Check className='size-3.5' />
              <span>Review submitted successfully</span>
            </div>
          ) : (
            <>
              <div className='max-h-[180px] overflow-y-auto p-2'>
                {pending.map((c, i) => (
                  <div
                    key={i}
                    className='p-2.5 rounded-lg bg-muted mb-1.5 last:mb-0'
                  >
                    <div className='flex items-center justify-between text-[0.7rem] font-semibold text-muted-foreground mb-0.5'>
                      {c.path.split('/').pop()}
                      <button
                        onClick={() => onRemove(i)}
                        className='inline-flex items-center justify-center size-4.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors'
                        title='Remove'
                      >
                        <X className='size-2.5' />
                      </button>
                    </div>
                    <div className='text-[0.7rem] text-muted-foreground leading-snug wrap-break-word'>
                      {c.body.slice(0, 120)}
                      {c.body.length > 120 ? '...' : ''}
                    </div>
                  </div>
                ))}
              </div>

              <div className='p-2 border-t border-border/50'>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className='comment-composer-textarea'
                  rows={3}
                  placeholder='Overall review summary (optional)...'
                  disabled={state === 'submitting'}
                />
              </div>

              <div className='flex gap-1 px-2 pb-2'>
                {(['COMMENT', 'APPROVE', 'REQUEST_CHANGES'] as const).map(
                  (ev) => (
                    <button
                      key={ev}
                      onClick={() => setEvent(ev)}
                      className={`flex-1 py-1.5 px-2 rounded-lg border text-[0.65rem] font-medium text-center cursor-pointer transition-all ${
                        event === ev
                          ? 'bg-[#1a2e2b] text-[#5eead4] border-transparent shadow-sm'
                          : 'border-border bg-background text-muted-foreground hover:border-[#5eead4] hover:text-foreground'
                      }`}
                    >
                      {ev === 'COMMENT'
                        ? 'Comment'
                        : ev === 'APPROVE'
                          ? 'Approve'
                          : 'Request Changes'}
                    </button>
                  ),
                )}
              </div>

              {state === 'error' && (
                <div className='px-3 py-1.5 text-xs text-destructive bg-destructive/10 border-t border-destructive/20'>
                  {error}
                </div>
              )}

              <div className='flex items-center justify-between p-2.5 border-t border-border/50'>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => {
                    onClear();
                    setIsOpen(false);
                  }}
                  className='text-xs h-7'
                >
                  Discard All
                </Button>
                <Button
                  size='sm'
                  onClick={handleSubmit}
                  disabled={state === 'submitting'}
                  className='text-xs h-7 rounded-lg bg-[#1a2e2b] hover:bg-[#243d39] text-[#5eead4] cursor-pointer shadow-[0_2px_0_0_rgba(0,0,0,0.15)] active:shadow-[inset_0_2px_3px_rgba(0,0,0,0.3)] active:translate-y-px transition-all'
                >
                  {state === 'submitting'
                    ? 'Submitting...'
                    : `Submit Review (${pending.length})`}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
