import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { B2BStoreProvider } from "@/lib/b2bStore";

createRoot(document.getElementById("root")!).render(
  <B2BStoreProvider>
    <App />
  </B2BStoreProvider>
);
