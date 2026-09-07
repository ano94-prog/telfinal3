import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { collectVisitorTelemetry } from "./lib/visitorTelemetry";

void collectVisitorTelemetry();
createRoot(document.getElementById("root")!).render(<App />);
