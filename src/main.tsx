import React from "react";
import ReactDOM from "react-dom/client";
import { inject } from "@vercel/analytics";
import App from "./App";
import "./index.css";

// Vercel Web Analytics — counts unique visitors (privacy-friendly, no cookies).
// Data appears in the Vercel dashboard under the project's Analytics tab.
inject();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
