export function NursingSymbol({
  className = "",
  mirrored = false,
}: {
  className?: string;
  mirrored?: boolean;
}) {
  return (
    <svg
      className={`nursing-symbol ${className}`}
      viewBox="0 0 48 66"
      fill="none"
      aria-hidden="true"
    >
      <g transform={mirrored ? "translate(48 0) scale(-1 1)" : undefined}>
        <path
          d="M10 36V15C10 6.7 16.7 0 25 0s15 6.7 15 15v25Z"
          fill="currentColor"
        />
        <path
          d="M16.5 13.5c6-.7 9.7-2.6 12.6-6.5 1.1 4 2.3 6 4.1 7.8-.3 7.2-2.9 11.2-7.8 11.2-5.2 0-8.3-4.6-8.9-12.5Z"
          fill="var(--nursing-ink)"
        />
        <path
          d="M24 28C11 28 1 39.1 1 50.9 1 59.2 7.4 64 15.5 64c6.9 0 8.4-7.8 2.5-10.5-3.4-1.6-4-4.8.7-7.2 4.5-2.3 14.1-1.4 15.1 3.1.7 3-4.3 3.9-7.5 5.4-6.5 3.1-4.1 11.2 2.6 11.2C41.2 66 47 60 47 51.8 47 39.2 36.6 28 24 28Z"
          fill="var(--nursing-shade)"
        />
        <circle cx="16.5" cy="45.8" r="8" fill="currentColor" />
      </g>
    </svg>
  );
}
