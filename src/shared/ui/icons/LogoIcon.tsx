interface LogoIconProps {
  size?: number;
}

export function LogoIcon({ size = 24 }: LogoIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id="logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="#0f0f13" />
      <path d="M6 16 C10 8, 14 24, 18 16 S26 8, 26 16" fill="none" stroke="url(#logo-g)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
