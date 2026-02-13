function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] rounded-lg bg-surface-hover" />
      <div className="mt-2 space-y-1.5">
        <div className="h-4 bg-surface-hover rounded w-3/4" />
        <div className="h-3 bg-surface-hover rounded w-1/3" />
      </div>
    </div>
  );
}

export { SkeletonCard };
