interface ChevronLeftIconProps {
  size?: number;
}

export function ChevronLeftIcon({ size = 16 }: ChevronLeftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0 }}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
