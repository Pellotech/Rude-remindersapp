export default function SplashScreen() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FDF3E3",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <img
        src="/rose_transparent.png"
        alt="Rude Reminders"
        className="rose-appear"
        style={{
          width: 180,
          height: 180,
          objectFit: "contain",
          opacity: 0,
        }}
      />
    </div>
  );
}

interface RoseLoaderProps {
  size?: number;
  label?: string;
  className?: string;
}

export function RoseLoader({ size = 48, label, className }: RoseLoaderProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <img
        src="/rose_transparent.png"
        alt={label ?? "Loading"}
        className="rose-pulse"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
        }}
      />
      {label ? (
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{label}</span>
      ) : null}
    </div>
  );
}
