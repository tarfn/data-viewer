import type { ReactNode } from "react";

const drawings: Record<string, ReactNode> = {
  postgres: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
    </>
  ),
  mongo: (
    <>
      <path d="M12 2C2 9 6 17 12 20c6-3 10-11 0-18Z" />
      <path d="M12 8v14m0-9 4-4m-4 7-3-4" />
    </>
  ),
  kafka: (
    <>
      <circle cx="6" cy="5" r="3" />
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="12" r="3" />
      <path d="M6 8v8m3-10 6 4m-6 8 6-4" />
    </>
  ),
  http: <path d="m8 5-6 7 6 7m8-14 6 7-6 7m-3-16-2 18" />,
  profile: <path d="M8 2v5m8-5v5M5 7h14v4a7 7 0 0 1-14 0Zm7 11v4" />,
  schema: (
    <>
      <rect x="8" y="2" width="8" height="6" rx="1" />
      <rect x="2" y="16" width="8" height="6" rx="1" />
      <rect x="14" y="16" width="8" height="6" rx="1" />
      <path d="M12 8v4H6v4m6-4h6v4" />
    </>
  ),
  table: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 9v12m6-12v12" />
    </>
  ),
  collection: (
    <>
      <rect x="6" y="6" width="15" height="15" rx="2" />
      <path d="M17 3H3v14m7-7h7m-7 4h7m-7 4h4" />
    </>
  ),
  folder: (
    <path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  ),
  topic: (
    <>
      <circle cx="4" cy="6" r="2" />
      <circle cx="4" cy="12" r="2" />
      <circle cx="4" cy="18" r="2" />
      <path d="M9 6h12M9 12h12M9 18h12" />
    </>
  ),
  request: <path d="M3 7h14m-4-4 4 4-4 4m8 10H7m4-4-4 4 4 4" />,
  edit: (
    <path d="m4 15 11-11a2.8 2.8 0 0 1 4 4L8 19l-5 2 1-6ZM13 6l4 4M4 15l4 4" />
  ),
};

export function Icon({ name }: { name: string }) {
  return (
    <span className="icon" data-icon={name} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {drawings[name] || drawings.profile}
      </svg>
    </span>
  );
}
