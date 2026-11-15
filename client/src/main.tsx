import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeSafeArea } from "./utils/safeAreaSetup";
import { initAuthToken } from "@/lib/queryClient";
import { applyTextSize } from "@/lib/textSize";

async function bootstrap() {
  initializeSafeArea();
  void applyTextSize(); // the user's saved Text Size (Settings → Text Size & Time Zone)
  await initAuthToken();
  createRoot(document.getElementById("root")!).render(<App />);
}

bootstrap();
