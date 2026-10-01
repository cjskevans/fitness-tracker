import { getStatus, subscribe, reportReachable, reportUnreachable, __reset } from '../connection';

describe('connection store', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
    __reset();
  });

  afterEach(() => {
    __reset();
    jest.useRealTimers();
    delete global.fetch;
  });

  it('starts out reachable', () => {
    expect(getStatus()).toBe(true);
  });

  it('flips to unreachable and notifies subscribers', () => {
    const listener = jest.fn();
    subscribe(listener);

    reportUnreachable();

    expect(getStatus()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies once for a burst of failures, so toasts cannot stack', () => {
    const listener = jest.fn();
    subscribe(listener);

    reportUnreachable();
    reportUnreachable();
    reportUnreachable();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);
    unsubscribe();

    reportUnreachable();

    expect(listener).not.toHaveBeenCalled();
  });

  it('polls the health endpoint while unreachable', () => {
    reportUnreachable();
    expect(global.fetch).not.toHaveBeenCalled();

    jest.advanceTimersByTime(5000);
    expect(global.fetch).toHaveBeenCalledWith('/api/health');

    jest.advanceTimersByTime(5000);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not poll while reachable', () => {
    jest.advanceTimersByTime(20000);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('recovers and stops polling when a poll succeeds', async () => {
    const listener = jest.fn();
    subscribe(listener);
    reportUnreachable();

    jest.advanceTimersByTime(5000);
    await Promise.resolve(); // let the fetch promise settle

    expect(getStatus()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2); // offline, then back online

    global.fetch.mockClear();
    jest.advanceTimersByTime(20000);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('keeps polling while the health check keeps failing', async () => {
    global.fetch.mockImplementation(() => Promise.reject(new Error('Network Error')));
    reportUnreachable();

    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(getStatus()).toBe(false);

    jest.advanceTimersByTime(5000);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('treats a non-ok health response as still down', async () => {
    global.fetch.mockImplementation(() => Promise.resolve({ ok: false }));
    reportUnreachable();

    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(getStatus()).toBe(false);
  });

  it('reports reachable again after a successful request', () => {
    reportUnreachable();
    reportReachable();
    expect(getStatus()).toBe(true);
  });
});
