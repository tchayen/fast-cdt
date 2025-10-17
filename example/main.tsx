import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const rootElement = document.createElement("div");
rootElement.id = "root";
document.body.append(rootElement);

const root = createRoot(rootElement);
root.render(<App />);
