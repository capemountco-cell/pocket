import brandMarkUrl from "@/assets/brand-mark.svg";

export type BrandMarkProps = {
  size?: number | undefined;
  logoRef?: ((el: HTMLSpanElement | null) => void) | undefined;
};

// The center brand mark shared by ClassicNav and ModernNav: one self-contained
// SVG (dark orb + white swoosh, designed for the black chrome), so there is no
// per-theme variant to swap. Pulled out of the nav so both styles render the
// exact same spin/pulse choreography instead of forking it.
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
        <img
          src={brandMarkUrl}
          alt=""
          width={size}
          height={size}
          decoding="async"
          fetchPriority="high"
          style={{
            position: "absolute",
            inset: 0,
            width: size,
            height: size,
            display: "block",
            pointerEvents: "none",
            objectFit: "contain",
          }}
        />
      </span>
    </span>
  );
}
