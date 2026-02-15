// import { apiUrl } from "../constants";
function getCSRFToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

class ApiClient {
  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const BASE_URL = "https://localhost:8000";; // Maybe should be this but idk: import.meta.env.VITE_BACKEND_API_URL || "https://localhost:8000";

    const url = `${BASE_URL}/api${endpoint}`;
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
        ...options.headers,
      },
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

  async delete(endpoint: string): Promise<Response> {
    return this.request(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
