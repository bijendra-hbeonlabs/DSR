const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  token?: string;
}

async function apiCall(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', headers = {}, body, token } = options;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add authorization header if token is provided
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers: defaultHeaders,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      const error = await response.json();
      throw new Error(error.error || `API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[API ERROR]', endpoint, error);
    throw error;
  }
}

// Auth API methods
export const authAPI = {
  login: async (username: string, password: string, token?: string) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: { username, password },
      token,
    });
  },

  register: async (username: string, email: string, password: string, roleId?: number, departmentId?: number, token?: string) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: { username, email, password, roleId, departmentId },
      token,
    });
  },

  logout: async (token?: string) => {
    return apiCall('/auth/logout', {
      method: 'POST',
      token,
    });
  },

  forgotPassword: async (username: string, email: string, employeeId: number) => {
    return apiCall('/auth/forgot-password', {
      method: 'POST',
      body: { username, email, employeeId }
    });
  },
};

// Employees API methods
export const employeesAPI = {
  getAll: async (params?: Record<string, any> | string, token?: string) => {
    if (typeof params === 'string') {
      return apiCall('/employees', { token: params });
    }
    const query = params ? new URLSearchParams(params).toString() : '';
    const endpoint = query ? `/employees?${query}` : '/employees';
    return apiCall(endpoint, { token });
  },

  getById: async (id: number, token?: string) => {
    return apiCall(`/employees/${id}`, { token });
  },

  create: async (data: any, token?: string) => {
    return apiCall('/employees', { method: 'POST', body: data, token });
  },

  update: async (id: number, data: any, token?: string) => {
    return apiCall(`/employees/${id}`, { method: 'PUT', body: data, token });
  },

  delete: async (id: number, token?: string) => {
    return apiCall(`/employees/${id}`, { method: 'DELETE', token });
  },
};

// Attendance API methods
export const attendanceAPI = {
  getAll: async (params?: Record<string, any>, token?: string) => {
    const query = new URLSearchParams(params || {}).toString();
    return apiCall(`/attendance?${query}`, { token });
  },

  getTodayStatus: async (token?: string) => {
    return apiCall('/attendance/today/status', { token });
  },

  checkIn: async (token?: string) => {
    return apiCall('/attendance/check-in', { method: 'POST', token });
  },

  checkOut: async (token?: string) => {
    return apiCall('/attendance/check-out', { method: 'POST', token });
  },

  exportSummary: async (startDate: string, endDate: string, token?: string) => {
    return apiCall(`/attendance/export-summary?startDate=${startDate}&endDate=${endDate}`, { token });
  },

  esslSync: async (ip: string, port: number, token?: string) => {
    return apiCall('/attendance/essl-sync', {
      method: 'POST',
      body: { ip, port },
      token
    });
  },
};

// Tasks API methods
export const tasksAPI = {
  getAll: async (params?: Record<string, any>, token?: string) => {
    const query = new URLSearchParams(params || {}).toString();
    return apiCall(`/tasks?${query}`, { token });
  },

  getById: async (id: number, token?: string) => {
    return apiCall(`/tasks/${id}`, { token });
  },

  create: async (data: any, token?: string) => {
    return apiCall('/tasks', { method: 'POST', body: data, token });
  },

  update: async (id: number, data: any, token?: string) => {
    return apiCall(`/tasks/${id}`, { method: 'PUT', body: data, token });
  },

  updateStatus: async (id: number, status: string, token?: string) => {
    return apiCall(`/tasks/${id}/status`, { method: 'PATCH', body: { status }, token });
  },

  delete: async (id: number, token?: string) => {
    return apiCall(`/tasks/${id}`, { method: 'DELETE', token });
  },
};

// Projects API methods
export const projectsAPI = {
  getAll: async (params?: Record<string, any>, token?: string) => {
    const query = new URLSearchParams(params || {}).toString();
    return apiCall(`/projects?${query}`, { token });
  },

  getById: async (id: number, token?: string) => {
    return apiCall(`/projects/${id}`, { token });
  },

  create: async (data: any, token?: string) => {
    return apiCall('/projects', { method: 'POST', body: data, token });
  },

  update: async (id: number, data: any, token?: string) => {
    return apiCall(`/projects/${id}`, { method: 'PUT', body: data, token });
  },

  getMembers: async (projectId: number, token?: string) => {
    return apiCall(`/projects/${projectId}/members`, { token });
  },

  addMember: async (projectId: number, userId: number, role = 'Member', token?: string) => {
    return apiCall(`/projects/${projectId}/members`, {
      method: 'POST',
      body: { userId, role },
      token,
    });
  },

  delete: async (id: number, token?: string) => {
    return apiCall(`/projects/${id}`, { method: 'DELETE', token });
  },
};

// DSR API methods
export const dsrAPI = {
  getAll: async (params?: Record<string, any>, token?: string) => {
    const query = new URLSearchParams(params || {}).toString();
    return apiCall(`/dsr?${query}`, { token });
  },

  getById: async (id: number, token?: string) => {
    return apiCall(`/dsr/${id}`, { token });
  },

  create: async (data: any, token?: string) => {
    return apiCall('/dsr', { method: 'POST', body: data, token });
  },

  update: async (id: number, data: any, token?: string) => {
    return apiCall(`/dsr/${id}`, { method: 'PUT', body: data, token });
  },

  submit: async (id: number, token?: string) => {
    return apiCall(`/dsr/${id}/submit`, { method: 'POST', token });
  },

  approve: async (id: number, reviewComments?: string, token?: string) => {
    return apiCall(`/dsr/${id}/approve`, { method: 'POST', body: { reviewComments }, token });
  },

  reject: async (id: number, reviewComments?: string, token?: string) => {
    return apiCall(`/dsr/${id}/reject`, { method: 'POST', body: { reviewComments }, token });
  },
};

// Leaves API methods
export const leavesAPI = {
  getAll: async (params?: Record<string, any>, token?: string) => {
    const query = new URLSearchParams(params || {}).toString();
    return apiCall(`/leaves?${query}`, { token });
  },

  getById: async (id: number, token?: string) => {
    return apiCall(`/leaves/${id}`, { token });
  },

  apply: async (data: any, token?: string) => {
    return apiCall('/leaves', { method: 'POST', body: data, token });
  },

  approve: async (id: number, token?: string) => {
    return apiCall(`/leaves/${id}/approve`, { method: 'POST', token });
  },

  reject: async (id: number, token?: string) => {
    return apiCall(`/leaves/${id}/reject`, { method: 'POST', token });
  },

  delete: async (id: number, token?: string) => {
    return apiCall(`/leaves/${id}`, { method: 'DELETE', token });
  },
};

// Dashboard API methods
export const dashboardAPI = {
  getStats: async (token?: string) => {
    return apiCall('/dashboard/stats', { token });
  },
};

// Announcements API methods
export const announcementsAPI = {
  getAll: async (token?: string) => {
    return apiCall('/announcements', { token });
  },
  create: async (data: any, token?: string) => {
    return apiCall('/announcements', { method: 'POST', body: data, token });
  },
  delete: async (id: number, token?: string) => {
    return apiCall(`/announcements/${id}`, { method: 'DELETE', token });
  },
};
