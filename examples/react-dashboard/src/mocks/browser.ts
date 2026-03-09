import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

// MSW service worker for the browser. Intercepts all fetch/XHR requests
// matching our handlers so TanStack Query talks to mock data, not a real API.
export const worker = setupWorker(...handlers);
