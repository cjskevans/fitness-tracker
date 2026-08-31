import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserPicker from '../components/UserPicker';
import * as api from '../api';

jest.mock('../api');

const authResponse = { token: 'jwt-token', userId: 1, username: 'alice' };

// Shape of an axios rejection, which is what UserPicker branches on.
const httpError = (status, error) => ({ response: { status, data: error ? { error } : {} } });

const submitButton = (mode = 'login') =>
  screen.getByRole('button', { name: mode === 'register' ? /create account/i : /let's go/i });

async function fillAndSubmit({ username = 'alice', password = 'password123', mode = 'login' } = {}) {
  if (mode === 'register') await userEvent.click(screen.getByRole('button', { name: /^register$/i }));
  await userEvent.type(screen.getByPlaceholderText('Username'), username);
  await userEvent.type(screen.getByPlaceholderText('Password'), password);
  await userEvent.click(submitButton(mode));
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe('UserPicker', () => {
  it('renders the login form by default', () => {
    render(<UserPicker onUser={() => {}} />);
    expect(screen.getByText('Fitness Tracker')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(submitButton('login')).toBeInTheDocument();
  });

  it('swaps the submit button when switching to register', async () => {
    render(<UserPicker onUser={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /^register$/i }));
    expect(submitButton('register')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /let's go/i })).not.toBeInTheDocument();
  });
});

describe('UserPicker — login', () => {
  it('calls login and hands the user up on success', async () => {
    api.login.mockResolvedValue(authResponse);
    const onUser = jest.fn();

    render(<UserPicker onUser={onUser} />);
    await fillAndSubmit();

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('alice', 'password123');
      expect(onUser).toHaveBeenCalledWith({ id: 1, username: 'alice' });
    });
    expect(api.register).not.toHaveBeenCalled();
  });

  it('persists the token and user to localStorage', async () => {
    api.login.mockResolvedValue(authResponse);

    render(<UserPicker onUser={() => {}} />);
    await fillAndSubmit();

    await waitFor(() => {
      expect(localStorage.getItem('ft_token')).toBe('jwt-token');
      expect(JSON.parse(localStorage.getItem('ft_user'))).toEqual({ id: 1, username: 'alice' });
    });
  });

  it('trims whitespace from the username before submitting', async () => {
    api.login.mockResolvedValue(authResponse);

    render(<UserPicker onUser={() => {}} />);
    await fillAndSubmit({ username: '  alice  ' });

    await waitFor(() => expect(api.login).toHaveBeenCalledWith('alice', 'password123'));
  });

  it('shows a credentials message on 401', async () => {
    api.login.mockRejectedValue(httpError(401));

    render(<UserPicker onUser={() => {}} />);
    await fillAndSubmit();

    expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument();
  });
});

describe('UserPicker — register', () => {
  it('calls register instead of login', async () => {
    api.register.mockResolvedValue(authResponse);
    const onUser = jest.fn();

    render(<UserPicker onUser={onUser} />);
    await fillAndSubmit({ mode: 'register' });

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith('alice', 'password123');
      expect(onUser).toHaveBeenCalledWith({ id: 1, username: 'alice' });
    });
    expect(api.login).not.toHaveBeenCalled();
  });

  it('shows a taken-username message on 409', async () => {
    api.register.mockRejectedValue(httpError(409));

    render(<UserPicker onUser={() => {}} />);
    await fillAndSubmit({ mode: 'register' });

    expect(await screen.findByText('Username already taken.')).toBeInTheDocument();
  });
});

describe('UserPicker — error handling', () => {
  it('surfaces the server error message when there is one', async () => {
    api.login.mockRejectedValue(httpError(400, 'Username and password are required'));

    render(<UserPicker onUser={() => {}} />);
    await fillAndSubmit();

    expect(await screen.findByText('Username and password are required')).toBeInTheDocument();
  });

  it('falls back to a generic message when the request never reached the server', async () => {
    api.login.mockRejectedValue(new Error('Network Error'));

    render(<UserPicker onUser={() => {}} />);
    await fillAndSubmit();

    expect(await screen.findByText('Something went wrong. Try again.')).toBeInTheDocument();
  });

  it('clears the error when switching modes', async () => {
    api.login.mockRejectedValue(httpError(401));

    render(<UserPicker onUser={() => {}} />);
    await fillAndSubmit();
    expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^register$/i }));
    expect(screen.queryByText('Invalid username or password.')).not.toBeInTheDocument();
  });

  it('does not store anything when authentication fails', async () => {
    api.login.mockRejectedValue(httpError(401));

    render(<UserPicker onUser={() => {}} />);
    await fillAndSubmit();
    await screen.findByText('Invalid username or password.');

    expect(localStorage.getItem('ft_token')).toBeNull();
    expect(localStorage.getItem('ft_user')).toBeNull();
  });
});
