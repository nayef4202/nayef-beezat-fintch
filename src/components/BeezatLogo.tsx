import { cn } from "@/lib/utils";

type BeezatLogoProps = {
  compact?: boolean;
  className?: string;
};

function BeezatMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={cn("shrink-0", className)} fill="none">
      <path
        d="M115 24a72 72 0 1 1-43 137V24"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M72 96a41 41 0 1 1 43 41c-27 0-43-16-43-41Z"
        fill="var(--primary)"
        className="bz-logo-core"
      />
      <circle cx="115" cy="96" r="18" fill="var(--background)" />
      <circle cx="169" cy="43" r="11" fill="var(--primary)" className="bz-logo-dot" />
    </svg>
  );
}

export function BeezatLogo({ compact = false, className }: BeezatLogoProps) {
  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-2.5 text-primary", className)}>
        <span className="grid size-10 place-items-center rounded-lg border border-primary/25 bg-primary/10">
          <BeezatMark className="size-7" />
        </span>
        <span className="flex items-baseline gap-2 text-foreground">
          <span className="text-xl font-extrabold">بيزات</span>
          <span className="font-brand text-xl font-bold" dir="ltr">
            beezat<span className="text-primary">.</span>
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-col items-center text-primary", className)}>
      <BeezatMark className="size-40 sm:size-56 lg:size-64" />
      <span className="mt-2 text-5xl font-extrabold text-foreground sm:text-6xl">بيزات</span>
      <span className="font-brand mt-1 text-4xl font-bold text-foreground sm:text-5xl" dir="ltr">
        beezat<span className="text-primary">.</span>
      </span>
      <span className="mt-3 text-xs font-bold text-muted-foreground sm:text-sm">تقنية مالية ذكية</span>
    </span>
  );
}