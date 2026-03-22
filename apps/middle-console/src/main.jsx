import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

let root;

function render() {
  const target = document.getElementById("root");
  if (!root) {
    root = ReactDOM.createRoot(target);
  }
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

if (window.__POWERED_BY_WUJIE__) {
  window.__WUJIE_MOUNT = () => {
    render();
  };
  window.__WUJIE_UNMOUNT = () => {
    root?.unmount();
    root = null;
  };
  window.__WUJIE?.mount?.();
} else {
  render();
}
