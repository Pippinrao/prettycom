import type { JSX } from "react"

import type { MascotId } from "../../types"

interface MascotSvgProps {
  className?: string
}

function PinkSakuraBunny({ className }: MascotSvgProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <g className="mascot-tail">
        <circle cx="50" cy="46" r="6" fill="#fbcfe8" stroke="#f472b6" strokeWidth="1.2" />
      </g>
      <g className="mascot-ear-l">
        <ellipse cx="20" cy="20" rx="7" ry="15" fill="#fce7f3" stroke="#f472b6" strokeWidth="1.5" transform="rotate(-15 20 20)" />
        <ellipse cx="20" cy="22" rx="3.5" ry="9" fill="#fda4af" opacity="0.6" transform="rotate(-15 20 22)" />
      </g>
      <g className="mascot-ear-r">
        <ellipse cx="44" cy="20" rx="7" ry="15" fill="#fce7f3" stroke="#f472b6" strokeWidth="1.5" transform="rotate(15 44 20)" />
        <ellipse cx="44" cy="22" rx="3.5" ry="9" fill="#fda4af" opacity="0.6" transform="rotate(15 44 22)" />
      </g>
      <path
        d="M28 14 Q32 8 36 14 Q34 16 32 15 Q30 16 28 14Z"
        fill="#f472b6"
        stroke="#ec4899"
        strokeWidth="0.8"
      />
      <g className="mascot-body">
        <ellipse cx="32" cy="50" rx="17" ry="10" fill="#f472b6" opacity="0.12" />
        <ellipse cx="32" cy="38" rx="17" ry="15" fill="#fce7f3" stroke="#f472b6" strokeWidth="1.8" />
        <ellipse cx="22" cy="40" rx="3" ry="2" fill="#fda4af" opacity="0.55" />
        <ellipse cx="42" cy="40" rx="3" ry="2" fill="#fda4af" opacity="0.55" />
        <g className="mascot-eye">
          <ellipse cx="25" cy="35" rx="3.2" ry="4" fill="#831843" />
          <circle cx="26" cy="33.5" r="1.2" fill="#fff" opacity="0.9" />
        </g>
        <g className="mascot-eye">
          <ellipse cx="39" cy="35" rx="3.2" ry="4" fill="#831843" />
          <circle cx="40" cy="33.5" r="1.2" fill="#fff" opacity="0.9" />
        </g>
        <ellipse cx="32" cy="41" rx="2.2" ry="1.4" fill="#f472b6" />
        <path d="M27 44.5 Q32 47.5 37 44.5" stroke="#ec4899" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </g>
      <circle cx="12" cy="16" r="3.5" fill="#fda4af" opacity="0.55" />
      <circle cx="52" cy="12" r="3" fill="#fda4af" opacity="0.45" />
      <circle cx="32" cy="6" r="2.5" fill="#fda4af" opacity="0.4" />
      <circle cx="8" cy="28" r="2" fill="#fbcfe8" opacity="0.5" />
    </svg>
  )
}

function AnimeNeonFox({ className }: MascotSvgProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <g className="mascot-tail">
        <path d="M48 46 Q58 42 60 28 Q55 38 50 44" fill="#4338ca" stroke="#818cf8" strokeWidth="1.2" />
        <path d="M50 44 Q56 38 58 32" stroke="#67e8f9" strokeWidth="1" opacity="0.7" />
      </g>
      <path className="mascot-ear-l" d="M16 30 L8 8 L22 24 Z" fill="#312e81" stroke="#a78bfa" strokeWidth="1.5" />
      <path className="mascot-ear-r" d="M48 30 L56 8 L42 24 Z" fill="#312e81" stroke="#a78bfa" strokeWidth="1.5" />
      <g className="mascot-arm">
        <path d="M12 38 Q4 32 6 26" stroke="#c4b5fd" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="6" cy="26" r="2" fill="#f0abfc" />
      </g>
      <g className="mascot-body">
        <path d="M18 52 Q32 58 46 52 L44 38 Q32 43 20 38 Z" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
        <ellipse cx="32" cy="34" rx="15" ry="13" fill="#0f0a2e" stroke="#a78bfa" strokeWidth="2" />
        <g className="mascot-eye">
          <ellipse cx="24" cy="33" rx="4.5" ry="5.5" fill="#1e1b4b" stroke="#e879f9" strokeWidth="1" />
          <ellipse cx="24" cy="33" rx="3" ry="4" fill="#c4b5fd" />
          <circle cx="25.5" cy="31" r="1.4" fill="#fff" />
          <circle cx="22.5" cy="34.5" r="0.7" fill="#fff" opacity="0.6" />
        </g>
        <g className="mascot-eye">
          <ellipse cx="40" cy="33" rx="4.5" ry="5.5" fill="#1e1b4b" stroke="#e879f9" strokeWidth="1" />
          <ellipse cx="40" cy="33" rx="3" ry="4" fill="#c4b5fd" />
          <circle cx="41.5" cy="31" r="1.4" fill="#fff" />
          <circle cx="38.5" cy="34.5" r="0.7" fill="#fff" opacity="0.6" />
        </g>
        <path d="M29 39 L32 42 L35 39" stroke="#f0abfc" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <ellipse cx="32" cy="36" rx="1.5" ry="1" fill="#67e8f9" opacity="0.5" />
      </g>
      <circle className="theme-sparkle" cx="8" cy="14" r="2.5" fill="#e879f9" style={{ transformOrigin: "8px 14px" }} />
      <circle className="theme-sparkle" cx="56" cy="10" r="2" fill="#67e8f9" style={{ transformOrigin: "56px 10px", animationDelay: "80ms" }} />
      <circle className="theme-sparkle" cx="32" cy="4" r="2" fill="#f0abfc" style={{ transformOrigin: "32px 4px", animationDelay: "160ms" }} />
      <polygon points="54,18 55,21 58,21 56,23 57,26 54,24 51,26 52,23 50,21 53,21" fill="#fde047" opacity="0.85" />
    </svg>
  )
}

function AnimeStarCat({ className }: MascotSvgProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <g className="mascot-tail">
        <path d="M46 48 Q58 44 56 56 Q52 50 48 50" stroke="#67e8f9" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      <path className="mascot-ear-l" d="M20 32 L14 16 L26 28 Z" fill="#312e81" stroke="#67e8f9" strokeWidth="1.3" />
      <path className="mascot-ear-r" d="M44 32 L50 16 L38 28 Z" fill="#312e81" stroke="#67e8f9" strokeWidth="1.3" />
      <g className="mascot-body">
        <ellipse cx="32" cy="42" rx="15" ry="13" fill="#1e1b4b" stroke="#67e8f9" strokeWidth="1.5" />
        <g className="mascot-eye">
          <ellipse cx="25" cy="40" rx="3.5" ry="4.5" fill="#0f0a2e" stroke="#a5f3fc" strokeWidth="0.8" />
          <circle cx="26" cy="38.5" r="1.2" fill="#fff" />
        </g>
        <g className="mascot-eye">
          <ellipse cx="39" cy="40" rx="3.5" ry="4.5" fill="#0f0a2e" stroke="#a5f3fc" strokeWidth="0.8" />
          <circle cx="40" cy="38.5" r="1.2" fill="#fff" />
        </g>
        <path d="M29 44.5 Q32 47 35 44.5" stroke="#f0abfc" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <ellipse cx="22" cy="43" rx="2.5" ry="1.5" fill="#f0abfc" opacity="0.35" />
        <ellipse cx="42" cy="43" rx="2.5" ry="1.5" fill="#f0abfc" opacity="0.35" />
      </g>
      <polygon points="48,12 50,17 55,17 51,20 53,25 48,22 43,25 45,20 41,17 46,17" fill="#fde047" />
      <circle cx="12" cy="20" r="2" fill="#67e8f9" opacity="0.7" />
      <circle cx="56" cy="24" r="1.5" fill="#e879f9" opacity="0.6" />
    </svg>
  )
}

function CyberGridBot({ className }: MascotSvgProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <g className="mascot-antenna">
        <path d="M32 8 L32 16" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="6" r="2.5" fill="#22d3ee" className="mascot-led" />
      </g>
      <g className="mascot-body">
        <rect x="14" y="16" width="36" height="32" rx="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.8" />
        <rect x="18" y="20" width="28" height="14" rx="2" fill="#020617" stroke="#0891b2" strokeWidth="1.2" className="mascot-visor" />
        <rect x="20" y="22" width="10" height="3" rx="1" fill="#22d3ee" opacity="0.85" />
        <rect x="32" y="22" width="12" height="3" rx="1" fill="#06b6d4" opacity="0.55" />
        <rect x="20" y="27" width="6" height="2" rx="0.5" fill="#67e8f9" opacity="0.5" />
        <rect x="28" y="27" width="14" height="2" rx="0.5" fill="#22d3ee" opacity="0.35" />
        <rect x="20" y="38" width="24" height="6" rx="1" fill="#1e293b" stroke="#164e63" strokeWidth="1" />
        <path d="M22 41 H42" stroke="#22d3ee" strokeWidth="0.8" opacity="0.5" />
        <circle cx="24" cy="41" r="1" fill="#22d3ee" />
        <circle cx="40" cy="41" r="1" fill="#06b6d4" />
      </g>
      <g className="mascot-arm-l">
        <rect x="6" y="28" width="8" height="14" rx="2" fill="#1e293b" stroke="#22d3ee" strokeWidth="1.2" />
      </g>
      <g className="mascot-arm-r">
        <rect x="50" y="28" width="8" height="14" rx="2" fill="#1e293b" stroke="#22d3ee" strokeWidth="1.2" />
      </g>
      <rect x="18" y="50" width="10" height="6" rx="1" fill="#1e293b" stroke="#0891b2" strokeWidth="1" />
      <rect x="36" y="50" width="10" height="6" rx="1" fill="#1e293b" stroke="#0891b2" strokeWidth="1" />
      <path d="M12 56 H52" stroke="#22d3ee" strokeWidth="1" opacity="0.35" strokeDasharray="3 2" />
    </svg>
  )
}

const mascotComponents: Record<MascotId, (props: MascotSvgProps) => JSX.Element> = {
  "pink-sakura-bunny": PinkSakuraBunny,
  "anime-neon-fox": AnimeNeonFox,
  "anime-star-cat": AnimeStarCat,
  "cyber-grid-bot": CyberGridBot,
}

export function MascotSvg({ id, className }: { id: MascotId; className?: string }) {
  const Component = mascotComponents[id]
  return <Component className={className} />
}
