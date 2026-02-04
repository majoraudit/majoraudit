// import { apiUrl } from "../constants";

class ApiClient {
  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `/api${endpoint}`;
    const config: RequestInit = {
      headers: { "Content-Type": "application/json", ...options.headers },
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
