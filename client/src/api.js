import axios from 'axios';
import { reportReachable, reportUnreachable } from './connection';

// Without a timeout a backend that accepts the connection but never answers hangs
// forever, and the outage never surfaces.
const api = axios.create({ baseURL: '/api', timeout: 8000 });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('ft_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function isUnreachable(error) {
  const res = error.response;
  if (!res) return true; // connection refused, DNS, or timeout (ECONNABORTED)
  // In dev a dead backend still looks like an HTTP response: Vite's proxy answers
  // 500 text/plain with an empty body when it cannot reach the server. Everything
  // that actually reaches Express comes back from errorHandler.js as JSON, so the
  // content type is what separates "server said no" from "there was no server".
  // Testing the type rather than the body keeps exportWorkouts' blob responses
  // from being misread as an outage.
  const contentType = res.headers?.['content-type'] || '';
  return res.status === 500 && !String(contentType).includes('application/json');
}

api.interceptors.response.use(
  response => {
    reportReachable();
    return response;
  },
  error => {
    if (isUnreachable(error)) reportUnreachable();
    else reportReachable();
    // Rejected unchanged: UserPicker branches on err.response?.status.
    return Promise.reject(error);
  }
);

export const register = (username, password) =>
  api.post('/auth/register', { username, password }).then(r => r.data);

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then(r => r.data);

export const startDemo = () =>
  api.post('/auth/demo').then(r => r.data);

export const endDemo = () =>
  api.delete('/auth/demo');

export const logSession = (session) =>
  api.post('/sessions', session).then(r => r.data);

export const getSessions = () =>
  api.get('/sessions').then(r => r.data);

export const updateSession = (id, data) =>
  api.put(`/sessions/${id}`, data).then(r => r.data);

export const deleteSession = (id) =>
  api.delete(`/sessions/${id}`);

export const getChartData = (exercise) =>
  api.get('/workouts', { params: { exercise } }).then(r => r.data);

export const getExercises = () =>
  api.get('/exercises').then(r => r.data);

export const getPRs = () =>
  api.get('/prs').then(r => r.data);

export const getSettings = () =>
  api.get('/settings').then(r => r.data);

export const updateSettings = (data) =>
  api.put('/settings', data).then(r => r.data);

export const getTemplates = () =>
  api.get('/templates').then(r => r.data);

export const createTemplate = (data) =>
  api.post('/templates', data).then(r => r.data);

export const deleteTemplateById = (id) =>
  api.delete(`/templates/${id}`);

export const getLastTemplateSession = (templateId) =>
  api.get(`/templates/${templateId}/last-session`).then(r => r.data);

export const exportWorkouts = () =>
  api.get('/export', { responseType: 'blob' }).then(r => r.data);

export const importWorkouts = (csv) =>
  api.post('/import', { csv }).then(r => r.data);
