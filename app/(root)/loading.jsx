import Skeleton from "react-loading-skeleton";

export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse-slow">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-44" />
          <Skeleton
            circle
            className="h-8 w-8"
          />
        </div>
        <div className="flex gap-4 overflow-hidden pb-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="w-[140px] md:w-[220px] shrink-0 space-y-3">
              <Skeleton className="h-[180px] md:h-[280px] rounded-3xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex gap-4 overflow-hidden pb-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-3 shrink-0 w-[76px] md:w-[92px]">
              <Skeleton
                circle
                className="w-[76px] h-[76px] md:w-[92px] md:h-[92px]"
              />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-2xl p-3 bg-white/[0.03] border border-white/[0.05]">
              <Skeleton className="w-full aspect-square rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
