import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import {
  Category,
  Location,
  LocationCreate,
  LocationDetail,
  LocationUpdate,
  PathNode,
  PathNodeCreate,
  PathNodeUpdate,
  PathEdge,
  PathEdgeCreate,
  PathEdgeUpdate,
  QRCode,
  RouteRequest,
  RouteResponse,
  LoginRequest,
  TokenResponse,
  AdminStats,
  DataHealthReport,
} from '../types';

const TOKEN_KEY = 'campus_nav_admin_token';

// Create singleton Axios client
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT bearer token if available
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor: Standardize error unwrapping
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token on 401 unauthorized
      localStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Service API Methods
// ============================================================================

export const api = {
  // Authentication Helpers
  auth: {
    login: async (credentials: LoginRequest): Promise<TokenResponse> => {
      const response = await apiClient.post<TokenResponse>('/admin/login', credentials);
      if (response.data.access_token) {
        localStorage.setItem(TOKEN_KEY, response.data.access_token);
      }
      return response.data;
    },
    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
    },
    getToken: (): string | null => {
      return localStorage.getItem(TOKEN_KEY);
    },
    isAuthenticated: (): boolean => {
      return Boolean(localStorage.getItem(TOKEN_KEY));
    },
  },

  // Categories
  categories: {
    getAll: async (): Promise<Category[]> => {
      const response = await apiClient.get<Category[]>('/categories');
      return response.data;
    },
  },

  // Locations
  locations: {
    getAll: async (categoryId?: number): Promise<Location[]> => {
      const params = categoryId ? { category_id: categoryId } : undefined;
      const response = await apiClient.get<Location[]>('/locations', { params });
      return response.data;
    },
    getById: async (id: number): Promise<LocationDetail> => {
      const response = await apiClient.get<LocationDetail>(`/locations/${id}`);
      return response.data;
    },
    search: async (query: string): Promise<Location[]> => {
      const response = await apiClient.get<Location[]>('/locations/search', {
        params: { q: query },
      });
      return response.data;
    },
    create: async (data: LocationCreate): Promise<Location> => {
      const response = await apiClient.post<Location>('/admin/locations', data);
      return response.data;
    },
    update: async (id: number, data: LocationUpdate): Promise<Location> => {
      const response = await apiClient.put<Location>(`/admin/locations/${id}`, data);
      return response.data;
    },
    delete: async (id: number): Promise<{ status: string; id: number; entity: string }> => {
      const response = await apiClient.delete(`/admin/locations/${id}`);
      return response.data;
    },
    uploadPhoto: async (id: number, file: File): Promise<{ photo_url: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post<{ photo_url: string }>(
        `/admin/locations/${id}/photo`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      return response.data;
    },
  },

  // Route Calculation
  routes: {
    calculate: async (payload: RouteRequest): Promise<RouteResponse> => {
      const response = await apiClient.post<RouteResponse>('/routes', payload);
      return response.data;
    },
  },

  // QR Codes
  qr: {
    resolve: async (identifier: string): Promise<QRCode> => {
      const response = await apiClient.get<QRCode>(`/qr/${identifier}`);
      return response.data;
    },
  },

  // Path Nodes
  nodes: {
    getAll: async (): Promise<PathNode[]> => {
      const response = await apiClient.get<PathNode[]>('/admin/nodes');
      return response.data;
    },
    create: async (data: PathNodeCreate): Promise<PathNode> => {
      const response = await apiClient.post<PathNode>('/admin/nodes', data);
      return response.data;
    },
    update: async (id: number, data: PathNodeUpdate): Promise<PathNode> => {
      const response = await apiClient.put<PathNode>(`/admin/nodes/${id}`, data);
      return response.data;
    },
    delete: async (id: number): Promise<{ status: string; id: number; entity: string }> => {
      const response = await apiClient.delete(`/admin/nodes/${id}`);
      return response.data;
    },
  },

  // Path Edges
  edges: {
    getAll: async (): Promise<PathEdge[]> => {
      const response = await apiClient.get<PathEdge[]>('/admin/edges');
      return response.data;
    },
    create: async (data: PathEdgeCreate): Promise<PathEdge> => {
      const response = await apiClient.post<PathEdge>('/admin/edges', data);
      return response.data;
    },
    update: async (id: number, data: PathEdgeUpdate): Promise<PathEdge> => {
      const response = await apiClient.put<PathEdge>(`/admin/edges/${id}`, data);
      return response.data;
    },
    delete: async (id: number): Promise<{ status: string; id: number; entity: string }> => {
      const response = await apiClient.delete(`/admin/edges/${id}`);
      return response.data;
    },
  },

  // Admin Dashboard & Health
  admin: {
    getStats: async (): Promise<AdminStats> => {
      const response = await apiClient.get<AdminStats>('/admin/stats');
      return response.data;
    },
    getHealth: async (): Promise<DataHealthReport> => {
      const response = await apiClient.get<DataHealthReport>('/admin/health');
      return response.data;
    },
  },

  // Health
  health: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await apiClient.get<{ status: string; timestamp: string }>('/health');
    return response.data;
  },
};

export default api;
