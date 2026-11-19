import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeSafeArea } from "./utils/safeAreaSetup";
import { initAuthToken } from "@/lib/queryClient";
import { applyTextSize } from "@/lib/textSize";
import { initI18n } from "@/i18n";

async function bootstrap() {
  initializeSafeArea();
  void applyTextSize(); // the user's saved Text Size (Settings → Text Size & Time Zone)
  await Promise.all([initAuthToken(), initI18n()]);
  createRoot(document.getElementById("root")!).render(<App />);
}

bootstrap();
