import type { ApiErrorResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  public status: number;
  public errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions extends RequestInit {
  organizationId?: number | null;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { organizationId, headers: customHeaders, body, ...restOptions } = options;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const activeOrgId = organizationId ?? localStorage.getItem('active_organization_id');
  if (activeOrgId) {
    headers['X-Organization-Id'] = String(activeOrgId);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers,
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    ...restOptions,
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse = { message: 'An unexpected HTTP error occurred.' };
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText || `HTTP Error ${response.status}` };
    }

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
    }

    throw new ApiError(response.status, errorData.message, errorData.errors);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return response.text() as unknown as Promise<T>;
}

export const apiClient = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { method: 'GET', ...options });
  },

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { method: 'POST', body: JSON.stringify(data), ...options });
  },

  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data), ...options });
  },

  patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data), ...options });
  },

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE', ...options });
  },
};
