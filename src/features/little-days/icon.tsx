const paths: Record<string, string> = {
  bottle: "M9 3h6v4l2 3v10H7V10l2-3V3m0 4h6M7 13h10",
  drop: "M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z",
  moon: "M20 14A8 8 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z",
  bath: "M3 12h18l-2 7H5l-2-7Zm2 0V5a2 2 0 0 1 4 0M6 19v2m12-2v2",
  plus: "M12 4v16M4 12h16",
  ruler: "M4 7h16v10H4V7Zm4 0v4m4-4v3m4-3v4",
  leaf: "M19 4C9 3 3 8 6 15s14 3 13-11ZM6 19l9-10",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  box: "m3 7 9-4 9 4v11l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v11",
  book: "M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h3",
};
export function Icon({
  name = "spark",
  size = 22,
}: {
  name?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.spark} />
    </svg>
  );
}
