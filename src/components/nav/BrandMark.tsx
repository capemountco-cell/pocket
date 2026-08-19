export type BrandMarkProps = {
  size?: number | undefined;
  logoRef?: ((el: HTMLSpanElement | null) => void) | undefined;
};

// The center brand mark shared by ClassicNav and ModernNav: a dark orb with
// a pointer glyph, drawn inline so it needs no asset request and stays sharp
// at any size. Pulled out of the nav so both styles render the exact same
// spin/pulse choreography instead of forking it.
export function BrandMark({ size = 44, logoRef }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        // The mark is a square orb (1:1 viewBox), so the box must stay SQUARE
        // to keep it pixel-centred.
        display: "inline-block",
        width: size,
        height: size,
        position: "relative",
        pointerEvents: "none",
      }}
    >
      {/* Inner node owns EVERY transform (spin rotate + pulse scale). It is
          absolutely positioned and out of flow with a fixed size and
          transform-origin pinned to center, so the spin rotates about the
          mark's own midpoint -- it can neither drift the logo nor
          reflow/shove the nav chrome around it. */}
      <span
        ref={logoRef}
        onAnimationEnd={(e) => {
          const el = e.currentTarget as HTMLSpanElement;
          const name = (e as React.AnimationEvent).animationName;
          if (name === "logo-spin") el.classList.remove("logo-spin");
          if (name === "logo-pulse") el.classList.remove("logo-pulse");
        }}
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
          transformOrigin: "center center",
          pointerEvents: "none",
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          style={{ position: "absolute", inset: 0, display: "block", pointerEvents: "none" }}
        >
          <defs>
            <linearGradient
              id="app-brand-orb"
              x1="44"
              y1="61"
              x2="19"
              y2="3"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#000000" />
              <stop offset="1" stopColor="#232323" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="32" fill="url(#app-brand-orb)" />
          <path d="M32 15.5 38.9 29.1 32 32 25.1 29.1 32 15.5Z" fill="#ffffff" />
          <path d="M32 48.5 25.1 34.9 32 32 38.9 34.9 32 48.5Z" fill="#ffffff" fillOpacity="0.55" />
        </svg>
      </span>
    </span>
  );
}
