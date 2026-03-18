function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="dash-card p-3 flex flex-col items-center gap-1.5">
            <Shimmer className="h-5 w-10 rounded-md" />
            <Shimmer className="h-2.5 w-12 rounded-md" />
          </div>
        ))}
      </div>

      <div className="dash-card p-3">
        <div className="flex items-center justify-between mb-1.5">
          <Shimmer className="h-3 w-8 rounded-md" />
          <Shimmer className="h-3 w-8 rounded-md" />
        </div>
        <Shimmer className="h-2 w-full rounded-full" />
      </div>

      <div className="dash-card p-3 space-y-2">
        <Shimmer className="h-2.5 w-14 rounded-md" />
        <Shimmer className="h-16 w-full rounded-lg" />
      </div>

      <div className="dash-card p-3 space-y-2">
        <Shimmer className="h-2.5 w-12 rounded-md" />
        <div className="flex items-center gap-2">
          <Shimmer className="size-5 rounded-full" />
          <Shimmer className="h-3 w-20 rounded-md" />
          <Shimmer className="h-4 w-12 rounded" />
        </div>
      </div>

      <div className="dash-card p-3 space-y-2">
        <Shimmer className="h-2.5 w-20 rounded-md" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Shimmer className="h-3 flex-1 rounded-md" />
            <Shimmer className="h-1.5 w-16 rounded-full" />
            <Shimmer className="h-3 w-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
