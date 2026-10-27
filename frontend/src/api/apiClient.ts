import { apiUrl } from "../constants";

export function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

let csrfToken = "";

export async function fetchCsrfToken(): Promise<string> {
  const cookieToken = getCsrfToken();
  if (cookieToken) return cookieToken;
  if (csrfToken) return csrfToken;

  const response = await fetch(`${apiUrl}/auth/csrf/`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Unable to obtain CSRF token");
  csrfToken = (await response.json()).csrfToken;
  return csrfToken;
}

class ApiClient {
  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${apiUrl}${endpoint}`;
    const method = (options.method || "GET").toUpperCase();
    const token = ["POST", "PUT", "PATCH", "DELETE"].includes(method)
      ? await fetchCsrfToken()
      : getCsrfToken();
    const config: RequestInit = {
      headers: { "Content-Type": "application/json", "X-CSRFToken": token, ...options.headers },
      credentials: "include",
      ...options,
    };

    const response = await fetch(url, config);
    
    return response;
  }

  async get(endpoint: string): Promise<Response> {
    return this.request(endpoint, { method: "GET" });
  }

  async post(endpoint: string, data?: any): Promise<Response> {
    return this.request(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: any): Promise<Response> {
    return this.request(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch(endpoint: string, data?: any): Promise<Response> {
    return this.request(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string): Promise<Response> {
    return this.request(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
