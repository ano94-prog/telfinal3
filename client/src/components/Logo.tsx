export function Logo({ className = "", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="40px"
      height="40px"
      viewBox="0 0 40 40"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Company Logo"
      role="img"
      focusable="false"
      className={className}
      {...props}
    >
      <title>Logo</title>
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0D54FF" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <circle cx="20" cy="20" r="18" stroke="url(#logoGradient)" strokeWidth="3" />
        <path
          d="M14,20 C14,16.686 16.686,14 20,14 C23.314,14 26,16.686 26,20"
          stroke="url(#logoGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="20" cy="20" r="3" fill="url(#logoGradient)" />
      </g>
    </svg>
  );
}
