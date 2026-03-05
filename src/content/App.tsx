import { useState, useEffect } from "react";
import { ChatPanel } from "./components/ChatPanel";

export function App() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "p") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* Floating toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="prs-fixed prs-bottom-6 prs-right-6 prs-w-12 prs-h-12 prs-rounded-full prs-bg-purple-600 hover:prs-bg-purple-700 prs-text-white prs-shadow-lg hover:prs-shadow-xl prs-transition-all prs-flex prs-items-center prs-justify-center prs-z-[2147483646] prs-border-0 prs-cursor-pointer"
          title="Open PR Sidekick (Ctrl+Shift+P)"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>
      )}

      {/* Side panel — stop keyboard events from reaching GitHub's global handlers */}
      {isOpen && (
        <div
          className="prs-fixed prs-top-0 prs-right-0 prs-h-full prs-w-[400px] prs-shadow-2xl prs-z-[2147483647] prs-border-l prs-border-neutral-200 prs-bg-white prs-flex prs-flex-col prs-animate-slide-in"
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
        >
          <ChatPanel onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}
