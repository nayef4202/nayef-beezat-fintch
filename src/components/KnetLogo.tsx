export function KnetLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 44"
      role="img"
      aria-label="KNET"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0.75" y="0.75" width="118.5" height="42.5" rx="10" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
      <text
        x="60"
        y="21"
        textAnchor="middle"
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fontSize="16"
        fontWeight="700"
        letterSpacing="2"
        fill="var(--primary)"
      >
        KNET
      </text>
      <text
        x="60"
        y="34"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontSize="8"
        letterSpacing="0.5"
        fill="var(--muted-foreground)"
      >
        الشبكة الكويتية
      </text>
    </svg>
  );
}
