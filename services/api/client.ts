import { Platform } from 'react-native';

// Get base URL from environment or use dev fallbacks
function getApiBaseUrl(): string {
  // Check for environment variable first
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // Dev fallbacks based on platform
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine localhost
    return 'http://10.0.2.2:8081/api/v1';
  } else if (Platform.OS === 'ios') {
    // iOS simulator can use localhost
    return 'http://localhost:8081/api/v1';
  }

  // Web or other platforms
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

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      // Handle non-JSON responses
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
        return await response.json();
      } else {
        return await response.text() as T;
      }
    } catch (error: any) {
      // Network error or other fetch failures
      if (error.message && error.status) {
        throw error; // Already an ApiError
      }

      const apiError: ApiError = {
        message: error.message || 'Network request failed',
      };
      throw apiError;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
