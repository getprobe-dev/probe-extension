import { createRoot } from "react-dom/client";
import { PopupApp } from "./App";
import "../styles/popup.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<PopupApp />);
}
