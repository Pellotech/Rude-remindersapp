import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeSafeArea } from "./utils/safeAreaSetup";
import { initAuthToken } from "@/lib/queryClient";

async function bootstrap() {
  initializeSafeArea();
  await initAuthToken();
  createRoot(document.getElementById("root")!).render(<App />);
}

bootstrap();
