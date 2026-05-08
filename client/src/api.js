import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('ft_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const register = (username, password) =>
  api.post('/auth/register', { username, password }).then(r => r.data);

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then(r => r.data);

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
