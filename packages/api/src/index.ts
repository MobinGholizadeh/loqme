/**
 * @loqme/api — Universal, Type-Safe API Client for Web & Mobile
 * Abstracted over native fetch; supports cookies and Bearer tokens
 */

import {
  RequestOtpResult,
  VerifyOtpResult,
  SessionPayload,
  ApiResponse, BusinessCityDto, BusinessPlaceDto, MerchantApplicationDto, MerchantApplicationInput,
  AdminMerchantApplicationDto, ReviewMerchantApplicationInput,
  MerchantContextDto, MerchantDataReportDto,
} from '@loqme/types';
import {
  RequestOtpInput,
  VerifyOtpInput,
} from '@loqme/validation';

export class LoqmeApiError extends Error {
  public status: number;
  public code?: string;
  public details?: Record<string, string[]>;

  constructor(message: string, status: number = 500, code?: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'LoqmeApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiClientConfig {
  baseUrl?: string;
  getAuthToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
}

export function createApiClient(config: ApiClientConfig = {}) {
  const getBaseUrl = () => {
    if (config.baseUrl) return config.baseUrl.replace(/\/$/, '');
    if (typeof window !== 'undefined') return '';
    return 'http://localhost:3000';
  };

  const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (config.getAuthToken) {
      const token = await config.getAuthToken();
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      if (response.status === 401 && config.onUnauthorized) {
        config.onUnauthorized();
      }
      const message = data?.message || `خطای سرور (${response.status})`;
      throw new LoqmeApiError(message, response.status, data?.code, data?.details);
    }

    return data as T;
  };

  return {
    merchantData: {
      contexts: () => request<ApiResponse<MerchantContextDto[]>>('/api/merchant/contexts', { cache: 'no-store' }),
      report: (input: { merchantId: string; locationId?: string; days?: '7' | '30' }) => {
        const query = new URLSearchParams({ merchantId: input.merchantId, days: input.days ?? '7' });
        if (input.locationId) query.set('locationId', input.locationId);
        return request<ApiResponse<MerchantDataReportDto>>(`/api/merchant/reports?${query}`, { cache: 'no-store' });
      },
    },
    business: {
      cities: () => request<ApiResponse<BusinessCityDto[]>>('/api/business/cities'),
      searchPlaces: (q: string, cityId: string, signal?: AbortSignal) => request<ApiResponse<BusinessPlaceDto[]>>(`/api/business/places/search?${new URLSearchParams({ q, cityId })}`, { signal }),
      reversePlace: (latitude: number, longitude: number, signal?: AbortSignal) => request<ApiResponse<{ address: string; city: string; province: string }>>(`/api/business/places/reverse?${new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) })}`, { signal }),
      application: () => request<ApiResponse<MerchantApplicationDto | null>>('/api/business/application', { cache: 'no-store' }),
      submit: (data: MerchantApplicationInput) => request<ApiResponse<MerchantApplicationDto>>('/api/business/application', { method: 'POST', body: JSON.stringify(data) }),
      applications: (page = 1) => request<ApiResponse<{ items: AdminMerchantApplicationDto[]; total: number; page: number; pageSize: number }>>(`/api/admin/merchant-applications?page=${page}`, { cache: 'no-store' }),
      review: (id: string, data: ReviewMerchantApplicationInput) => request<ApiResponse<MerchantApplicationDto>>(`/api/admin/merchant-applications/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
    },
    auth: {
      requestOtp: (input: RequestOtpInput): Promise<RequestOtpResult> => {
        return request<RequestOtpResult>('/api/auth/request-otp', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },

      verifyOtp: (input: VerifyOtpInput): Promise<VerifyOtpResult> => {
        return request<VerifyOtpResult>('/api/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },

      getSession: (): Promise<{ authenticated: boolean; user: SessionPayload | null }> => {
        return request<{ authenticated: boolean; user: SessionPayload | null }>(
          '/api/auth/session',
          { method: 'GET' }
        );
      },

      logout: (): Promise<{ success: boolean; message: string }> => {
        return request<{ success: boolean; message: string }>('/api/auth/logout', {
          method: 'POST',
        });
      },

      getDevOtp: (mobile: string): Promise<{ record?: { code: string; mobile: string } }> => {
        return request<{ record?: { code: string; mobile: string } }>(
          `/api/auth/dev-otp?mobile=${encodeURIComponent(mobile)}`,
          { method: 'GET' }
        );
      },
    },

    raw: request,
  };
}

export type LoqmeApiClient = ReturnType<typeof createApiClient>;

// Default singleton client instance for convenience
export const apiClient = createApiClient();
