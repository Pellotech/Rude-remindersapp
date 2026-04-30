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
        style={{
          width: 180,
          height: 180,
          objectFit: "contain",
          opacity: 0,
          animation: "roseAppear 0.5s ease forwards",
        }}
      />
      <style>{`
        @keyframes roseAppear {
          0%   { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
