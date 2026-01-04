interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function Skeleton({ className, variant = "rectangular" }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-gray-800 rounded";
  
  const variantClasses = {
    text: "h-4",
    circular: "rounded-full aspect-square",
    rectangular: "rounded",
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
    />
  );
}

