import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Get base URL from environment or use dev fallbacks
function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8081/api/v1';
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:8081/api/v1';
  }

  return 'http://localhost:8081/api/v1';
}

export const API_BASE_URL = getApiBaseUrl();

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export class ApiClient {
  private baseUrl: string;
  private getToken?: () => Promise<string | null>;

  constructor(baseUrl: string = API_BASE_URL, getToken?: () => Promise<string | null>) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // On 401, try refreshing the token once and retry
      if (response.status === 401 && this.getToken) {
        const { data } = await supabase.auth.refreshSession();
        if (data.session) {
          headers['Authorization'] = `Bearer ${data.session.access_token}`;
          const retryResponse = await fetch(url, { ...options, headers });
          return this._parseResponse<T>(retryResponse);
        }
        const error: ApiError = { message: 'Session expired', status: 401 };
        throw error;
      }

      return this._parseResponse<T>(response);
    } catch (error: any) {
      if (error.status !== undefined) {
        throw error; // Already an ApiError
      }
      const apiError: ApiError = { message: error.message || 'Network request failed' };
      throw apiError;
    }
  }

  private async _parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      const errorBody = isJson ? await response.json() : await response.text();
      const error: ApiError = {
        message: typeof errorBody === 'string' ? errorBody : errorBody.message || 'Request failed',
        status: response.status,
        code: typeof errorBody === 'object' ? errorBody.code : undefined,
      };
      throw error;
    }

    if (isJson) {
      return response.json();
    }
    return response.text() as unknown as T;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Unauthenticated client for public endpoints
export const apiClient = new ApiClient();

// Factory that creates an authenticated client using the current Supabase session token.
// Use this for all endpoints that require a JWT.
export function createAuthenticatedClient(): ApiClient {
  return new ApiClient(API_BASE_URL, async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  });
}
