"use client";

type FlyingCardProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  moving: boolean;
};

/** Face-down card that travels from the deck to a slot. */
export function FlyingCard({ x, y, width, height, moving }: FlyingCardProps) {
  return (
    <div
      className={`flying-card ${moving ? "is-moving" : ""}`}
      style={{
        width,
        height,
        transform: moving
          ? `translate3d(${x}px, ${y}px, 0) rotate(0deg)`
          : `translate3d(${x}px, ${y}px, 0) rotate(-8deg)`,
      }}
      aria-hidden
    >
      <div className="card-face card-back">
        <div className="card-back-pattern" />
      </div>
    </div>
  );
}
