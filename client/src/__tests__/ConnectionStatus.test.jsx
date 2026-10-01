import React from 'react';
import { render, act } from '@testing-library/react';
import toast from 'react-hot-toast';
import ConnectionStatus from '../components/ConnectionStatus';
import { reportReachable, reportUnreachable, __reset } from '../connection';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

describe('ConnectionStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn(() => new Promise(() => {})); // never settles
    __reset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    __reset();
    jest.useRealTimers();
    delete global.fetch;
  });

  it('says nothing while the server is reachable', () => {
    render(<ConnectionStatus />);
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows a toast that stays up when the server goes away', () => {
    render(<ConnectionStatus />);

    act(() => { reportUnreachable(); });

    expect(toast.error).toHaveBeenCalledWith(
      "Can't reach the server. Retrying…",
      expect.objectContaining({ duration: Infinity }),
    );
  });

  it('reuses one toast id so repeated failures do not stack', () => {
    render(<ConnectionStatus />);

    act(() => { reportUnreachable(); });
    act(() => { reportReachable(); });
    act(() => { reportUnreachable(); });

    const ids = [...toast.error.mock.calls, ...toast.success.mock.calls].map(([, opts]) => opts.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(1);
  });

  it('replaces the toast with a dismissable one on recovery', () => {
    render(<ConnectionStatus />);

    act(() => { reportUnreachable(); });
    act(() => { reportReachable(); });

    expect(toast.success).toHaveBeenCalledWith(
      'Back online',
      expect.objectContaining({ duration: 3000 }),
    );
  });

  it('does not announce recovery that never followed an outage', () => {
    render(<ConnectionStatus />);

    act(() => { reportReachable(); });

    expect(toast.success).not.toHaveBeenCalled();
  });
});
