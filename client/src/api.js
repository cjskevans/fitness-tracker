import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const createOrGetUser = (username) =>
  api.post('/users', { username }).then(r => r.data);

export const getWorkouts = (exercise, userId) =>
  api.get('/workouts', { params: { exercise, userId } }).then(r => r.data);

export const getExercises = (userId) =>
  api.get('/exercises', { params: { userId } }).then(r => r.data);

export const logWorkout = (workout) =>
  api.post('/workouts', workout).then(r => r.data);

export const deleteWorkout = (id) =>
  api.delete(`/workouts/${id}`);

export const getPRs = (userId) =>
  api.get('/prs', { params: { userId } }).then(r => r.data);
