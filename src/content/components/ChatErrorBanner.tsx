interface ChatErrorBannerProps {
  error: string;
}

export function ChatErrorBanner({ error }: ChatErrorBannerProps) {
  return (
    <div
      role="alert"
      className="px-3 py-1.5 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive"
    >
      {error}
    </div>
  );
}
