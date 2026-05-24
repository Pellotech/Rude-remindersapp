import { useState } from "react";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfflineScreenProps {
  onRetry: () => Promise<unknown> | void;
}

export default function OfflineScreen({ onRetry }: OfflineScreenProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FDF3E3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        zIndex: 9999,
      }}
    >
      <WifiOff size={64} style={{ color: "#7c2d12", marginBottom: 16 }} />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1f2937", marginBottom: 8 }}>
        No internet connection
      </h1>
      <p style={{ fontSize: 15, color: "#4b5563", maxWidth: 320, marginBottom: 24 }}>
        Rude Reminders needs an internet connection to sign you in and sync your
        reminders. Check your Wi‑Fi or mobile data, then try again.
      </p>
      <Button onClick={handleRetry} disabled={retrying} data-testid="button-retry-connection">
        {retrying ? "Retrying…" : "Try again"}
      </Button>
    </div>
  );
}
