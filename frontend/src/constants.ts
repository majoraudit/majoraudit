// Docker Compose serves the frontend and proxies `/api` to Django from the
// same origin. Keep the environment override for standalone deployments, but
// do not generate URLs such as `/undefined/auth/login/` when it is omitted.
export const apiUrl = import.meta.env.VITE_BACKEND_API_URL || "/api";
