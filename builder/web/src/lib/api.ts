const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Templates
  getTemplates: () => request<any[]>('/templates'),
  createTemplate: (data: any) => request<any>('/templates', { method: 'POST', body: JSON.stringify(data) }),
  getTemplate: (id: string) => request<any>(`/templates/${id}`),
  updateTemplate: (id: string, data: any) => request<any>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id: string) => request<any>(`/templates/${id}`, { method: 'DELETE' }),

  // Apps
  getApps: () => request<any[]>('/apps'),
  createApp: (data: any) => request<any>('/apps', { method: 'POST', body: JSON.stringify(data) }),
  getApp: (id: string) => request<any>(`/apps/${id}`),
  updateApp: (id: string, data: any) => request<any>(`/apps/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteApp: (id: string) => request<any>(`/apps/${id}`, { method: 'DELETE' }),

  // Keystore
  uploadKeystore: (appId: string, formData: FormData) =>
    request<any>(`/apps/${appId}/keystore`, { method: 'POST', body: formData }),
  generateKeystore: (appId: string) =>
    request<any>(`/apps/${appId}/keystore/generate`, { method: 'POST' }),

  // Logo - by package name (applicationId)
  uploadLogo: (applicationId: string, formData: FormData) =>
    request<any>(`/apps/logo/${encodeURIComponent(applicationId)}`, { method: 'POST', body: formData }),
  getLogoUrl: (applicationId: string) => `/api/apps/logo/${encodeURIComponent(applicationId)}`,

  // Builds
  getBuilds: (appId: string) => request<any[]>(`/apps/${appId}/builds`),
  createBuild: (appId: string, data: any) =>
    request<any>(`/apps/${appId}/builds`, { method: 'POST', body: JSON.stringify(data) }),
  getBuild: (buildId: string) => request<any>(`/builds/${buildId}`),
  cancelBuild: (buildId: string) =>
    request<any>(`/builds/${buildId}/cancel`, { method: 'POST' }),

  // Push Notifications
  getPushApps: () => request<any[]>('/push/apps'),
  sendPush: (data: any) => request<any>('/push/send', { method: 'POST', body: JSON.stringify(data) }),
  getPushHistory: (appId: string) => request<any[]>(`/push/history/${appId}`),
};
