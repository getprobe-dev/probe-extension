import { useCallback, useEffect, useState } from 'react';
import type { FocusedLineRange } from '../shared/types';
import { ChatPanel } from './components/ChatPanel';
import { FileButtons } from './components/FileButtons';
import { LineCommentButton } from './components/LineCommentButton';
import { getIconUrl } from './utils/theme';

const PANEL_WIDTH = 400;

export function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedFile, setFocusedFile] = useState<string | null>(null);
  const [focusedLineRange, setFocusedLineRange] =
    useState<FocusedLineRange | null>(null);
  const [prDiff, setPrDiff] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (!html.style.transition.includes('margin-right')) {
      html.style.transition = [html.style.transition, 'margin-right 0.25s cubic-bezier(0.16,1,0.3,1)']
        .filter(Boolean).join(', ');
    }
    html.style.marginRight = isOpen ? `${PANEL_WIDTH}px` : '';
    return () => { html.style.marginRight = ''; };
  }, [isOpen]);

  const handleFileSelect = useCallback((filePath: string) => {
    setFocusedFile(filePath);
    setFocusedLineRange(null);
    setIsOpen(true);
  }, []);

  const handleLineSelect = useCallback(
    (filePath: string, lineRange: FocusedLineRange) => {
      setFocusedFile(filePath);
      setFocusedLineRange(lineRange);
      setIsOpen(true);
    },
    [],
  );

  const handleClearFocus = useCallback(() => {
    setFocusedFile(null);
    setFocusedLineRange(null);
  }, []);

  return (
    <>
      <FileButtons onFileSelect={handleFileSelect} />
      <LineCommentButton onLineSelect={handleLineSelect} diff={prDiff} />

      {/* Floating toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className='fab-glow fixed bottom-6 right-6 size-12 rounded-full flex items-center justify-center border-0 cursor-pointer overflow-hidden p-0'
          style={{ zIndex: 2147483646, background: 'transparent' }}
          title='Open PRobe (Ctrl+Shift+P)'
        >
          <img
            src={getIconUrl(48)}
            alt='PRobe'
            width={48}
            height={48}
            style={{ borderRadius: '50%', display: 'block' }}
          />
        </button>
      )}

      {/* Side panel */}
      {isOpen && (
        <div
          className='fixed top-0 right-0 h-full w-[400px] panel-border-left bg-background flex flex-col animate-slide-in'
          style={{ zIndex: 2147483647 }}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
        >
          <ChatPanel
            onClose={() => setIsOpen(false)}
            focusedFile={focusedFile}
            focusedLineRange={focusedLineRange}
            onClearFocus={handleClearFocus}
            onDiffLoaded={setPrDiff}
          />
        </div>
      )}
    </>
  );
}
