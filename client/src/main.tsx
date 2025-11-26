import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeSafeArea } from "./utils/safeAreaSetup";

initializeSafeArea();

createRoot(document.getElementById("root")!).render(<App />);
