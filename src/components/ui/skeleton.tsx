import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-skeleton rounded-[12px] bg-cotton/60",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
