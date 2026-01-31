import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { store } from '../store';
import { updateTokens, logout } from '../store/slices/authSlice';

// API URL: Use environment variable (set in Vercel) or fallback for local dev
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance
export const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = store.getState().auth.accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = store.getState().auth.refreshToken;

            if (refreshToken) {
                try {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken,
                    });

                    const { accessToken, refreshToken: newRefreshToken } = response.data;
                    store.dispatch(updateTokens({ accessToken, refreshToken: newRefreshToken }));

                    // Retry original request
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return api(originalRequest);
                } catch {
                    // Refresh failed, logout
                    store.dispatch(logout());
                    window.location.href = '/login';
                }
            } else {
                store.dispatch(logout());
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

// API methods
export const authApi = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
        api.post('/auth/register', data),
    logout: (refreshToken: string) =>
        api.post('/auth/logout', { refreshToken }),
    refresh: (refreshToken: string) =>
        api.post('/auth/refresh', { refreshToken }),
};

export const leadsApi = {
    getAll: (params?: Record<string, unknown>) =>
        api.get('/leads', { params }),
    getById: (id: string) =>
        api.get(`/leads/${id}`),
    create: (data: Record<string, unknown>) =>
        api.post('/leads', data),
    update: (id: string, data: Record<string, unknown>) =>
        api.patch(`/leads/${id}`, data),
    delete: (id: string) =>
        api.delete(`/leads/${id}`),
    updateStage: (id: string, stage: string, reason?: string) =>
        api.post(`/leads/${id}/stage`, { stage, reason }),
    assign: (id: string, assignedToId: string) =>
        api.post(`/leads/${id}/assign`, { assignedToId }),
    getTimeline: (id: string, limit?: number) =>
        api.get(`/leads/${id}/timeline`, { params: { limit } }),
    addNote: (id: string, content: string, isPrivate?: boolean) =>
        api.post(`/leads/${id}/notes`, { content, isPrivate }),
};

export const usersApi = {
    getAll: () => api.get('/users'),
    getById: (id: string) => api.get(`/users/${id}`),
    getAvailableReps: () => api.get('/users/available-reps'),
    update: (id: string, data: Record<string, unknown>) => api.patch(`/users/${id}`, data),
};

export const aiApi = {
    processLead: (leadId: string) =>
        api.post(`/ai/leads/${leadId}/process`),
    getRecommendation: (leadId: string) =>
        api.get(`/ai/leads/${leadId}/recommendation`),
    scoreLead: (leadId: string) =>
        api.post(`/ai/leads/${leadId}/score`),
    generateEmail: (leadId: string, type: string) =>
        api.post(`/ai/leads/${leadId}/email`, { leadId, type }),
};

export const workflowApi = {
    getStageHistory: (leadId: string) =>
        api.get(`/workflow/leads/${leadId}/history`),
    getTransitions: (leadId: string) =>
        api.get(`/workflow/leads/${leadId}/transitions`),
    transitionStage: (leadId: string, stage: string, reason?: string) =>
        api.post(`/workflow/leads/${leadId}/transition`, { stage, reason }),
};

export const calendarApi = {
    getMeetings: (startDate?: string, endDate?: string) =>
        api.get('/calendar/meetings', { params: { startDate, endDate } }),
    getMeetingById: (id: string) =>
        api.get(`/calendar/meetings/${id}`),
    scheduleMeeting: (leadId: string, meetingType?: string) =>
        api.post(`/calendar/leads/${leadId}/schedule`, { meetingType }),
    getStatus: () =>
        api.get('/calendar/status'),
    getPendingOutcomes: () =>
        api.get('/calendar/meetings/pending-outcomes'),
    getSlots: (leadId: string, days?: number) =>
        api.get(`/calendar/leads/${leadId}/slots`, { params: { days } }),
    updateMeetingOutcome: (id: string, status: string, notes?: string) =>
        api.patch(`/calendar/meetings/${id}/outcome`, { status, notes }),
};

export const documentsApi = {
    generate: (template: string, leadId: string) =>
        api.post('/documents/generate', { template, leadId }),
    getAll: () => api.get('/documents'),
    getLeadDocuments: (leadId: string) => api.get(`/documents/lead/${leadId}`),
};

export const analyticsApi = {
    getSummary: () => api.get('/analytics/summary'),
    getFunnel: () => api.get('/analytics/funnel'),
    getMeetings: () => api.get('/analytics/meetings'),
    getPerformance: () => api.get('/analytics/performance'),
    getTimeline: () => api.get('/analytics/timeline'),
};

export const proposalApi = {
    // CRUD
    create: (data: { leadId: string; title: string; validUntil?: string; currency?: string; notes?: string; type?: 'TECHNICAL' | 'COMMERCIAL'; items?: any[]; attachmentUrl?: string; totalAmount?: number }) =>
        api.post('/proposals', data),
    getAll: (params?: { leadId?: string; status?: string }) =>
        api.get('/proposals', { params }),
    getById: (id: string) =>
        api.get(`/proposals/${id}`),
    update: (id: string, data: { title?: string; validUntil?: string; currency?: string; notes?: string }) =>
        api.patch(`/proposals/${id}`, data),
    delete: (id: string) =>
        api.delete(`/proposals/${id}`),

    // Item management
    addItem: (proposalId: string, item: { productName: string; description?: string; quantity: number; unitPrice: number }) =>
        api.post(`/proposals/${proposalId}/items`, item),
    removeItem: (proposalId: string, itemId: string) =>
        api.delete(`/proposals/${proposalId}/items/${itemId}`),

    // Status transitions
    send: (id: string) =>
        api.post(`/proposals/${id}/send`),
    accept: (id: string) =>
        api.post(`/proposals/${id}/accept`),
    decline: (id: string) =>
        api.post(`/proposals/${id}/decline`),
    uploadFile: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/proposals/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

export default api;


