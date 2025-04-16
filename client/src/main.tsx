import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global styles for audio visualization
const style = document.createElement('style');
style.textContent = `
  @keyframes equalize {
    0% { height: 5px; }
    50% { height: 20px; }
    100% { height: 5px; }
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(<App />);
