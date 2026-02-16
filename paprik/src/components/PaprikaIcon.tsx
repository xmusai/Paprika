export default function PaprikaIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2.5V5" />
      <path d="M9 5c-3 .5-5 3.5-5 7 0 4.5 3.5 9.5 8 9.5s8-5 8-9.5c0-3.5-2-6.5-5-7" />
      <path d="M9 5c0-1.7 1.3-3 3-3s3 1.3 3 3" />
      <path d="M12 8v9" />
    </svg>
  );
}
