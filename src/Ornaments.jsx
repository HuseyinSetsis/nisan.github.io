export function HeartMark() {
  return (
    <svg className="heart-mark" viewBox="0 0 24 22" fill="none" aria-hidden="true">
      <path
        d="M12 20S3 13.2 3 7.6C3 4.5 5.4 2.5 8.2 2.5c1.8 0 3.2.9 3.8 2.3.6-1.4 2-2.3 3.8-2.3C18.6 2.5 21 4.5 21 7.6 21 13.2 12 20 12 20z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}

export function CameraMark() {
  return (
    <svg className="camera-mark" viewBox="0 0 72 58" fill="none" aria-hidden="true">
      <rect x="4" y="16" width="64" height="38" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M22 16l4-10h20l4 10" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="36" cy="35" r="12" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M36 41s-6-3.6-6-7.4C30 31.2 31.6 30 33.2 30c1.1 0 2 .6 2.4 1.5.4-.9 1.3-1.5 2.4-1.5 1.6 0 3.2 1.2 3.2 3.6 0 3.8-6 7.4-6 7.4z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <circle cx="56" cy="24" r="2.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

export function Rule() {
  return (
    <div className="rule" aria-hidden="true">
      <span />
      <HeartMark />
      <span />
    </div>
  )
}
