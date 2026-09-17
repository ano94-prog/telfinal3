export function ErrorIcon() {
  return (
    <svg
      role="img"
      aria-label="Error"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      style={{
        display: "inline",
        verticalAlign: "middle",
        marginRight: "4px",
      }}
    >
      <circle cx="12" cy="12" r="12" fill="#d32f2f"></circle>
      <path
        d="M8 8l8 8M16 8l-8 8"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
      ></path>
    </svg>
  );
}
