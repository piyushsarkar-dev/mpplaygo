import Skeleton from "react-loading-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse-slow">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_340px]">
        <div className="space-y-4">
          <Skeleton className="h-[320px] md:h-[420px] w-full rounded-3xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <div className="flex items-center gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                circle
                className="h-10 w-10"
              />
            ))}
          </div>
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
