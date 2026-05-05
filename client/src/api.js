import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const createOrGetUser = (username) =>
  api.post('/users', { username }).then(r => r.data);

export const logSession = (session) =>
  api.post('/sessions', session).then(r => r.data);

export const getSessions = (userId) =>
  api.get('/sessions', { params: { userId } }).then(r => r.data);

export const updateSession = (id, data) =>
  api.put(`/sessions/${id}`, data).then(r => r.data);

export const deleteSession = (id) =>
  api.delete(`/sessions/${id}`);

export const getChartData = (exercise, userId) =>
  api.get('/workouts', { params: { exercise, userId } }).then(r => r.data);

export const getExercises = (userId) =>
  api.get('/exercises', { params: { userId } }).then(r => r.data);

export const getPRs = (userId) =>
  api.get('/prs', { params: { userId } }).then(r => r.data);

export const getSettings = (userId) =>
  api.get('/settings', { params: { userId } }).then(r => r.data);

export const updateSettings = (userId, data) =>
  api.put(`/settings/${userId}`, data).then(r => r.data);

export const getTemplates = (userId) =>
  api.get('/templates', { params: { userId } }).then(r => r.data);

export const createTemplate = (data) =>
  api.post('/templates', data).then(r => r.data);

export const deleteTemplateById = (id) =>
  api.delete(`/templates/${id}`);

export const getLastTemplateSession = (templateId) =>
  api.get(`/templates/${templateId}/last-session`).then(r => r.data);
