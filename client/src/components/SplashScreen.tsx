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

export function RoseLoader(_props: RoseLoaderProps = {}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(253, 243, 227, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <img
        src="/rose_transparent.png"
        alt="Loading"
        className="rose-spin"
        style={{
          width: 140,
          height: 140,
          objectFit: "contain",
        }}
      />
    </div>
  );
}
