import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserPicker from '../components/UserPicker';
import * as api from '../api';

jest.mock('../api');

describe('UserPicker', () => {
  it('renders the title and form controls', () => {
    render(<UserPicker onUser={() => {}} />);
    expect(screen.getByText('Fitness Tracker')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /let's go/i })).toBeInTheDocument();
  });

  it('calls onUser with user data on successful submit', async () => {
    const mockUser = { id: 1, username: 'alice' };
    api.createOrGetUser.mockResolvedValue(mockUser);
    const onUser = jest.fn();

    render(<UserPicker onUser={onUser} />);
    await userEvent.type(screen.getByPlaceholderText('Username'), 'alice');
    await userEvent.click(screen.getByRole('button', { name: /let's go/i }));

    await waitFor(() => {
      expect(api.createOrGetUser).toHaveBeenCalledWith('alice');
      expect(onUser).toHaveBeenCalledWith(mockUser);
    });
  });

  it('trims whitespace from the username before submitting', async () => {
    api.createOrGetUser.mockResolvedValue({ id: 1, username: 'alice' });

    render(<UserPicker onUser={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText('Username'), '  alice  ');
    await userEvent.click(screen.getByRole('button', { name: /let's go/i }));

    await waitFor(() => {
      expect(api.createOrGetUser).toHaveBeenCalledWith('alice');
    });
  });

  it('shows an error message when the API call fails', async () => {
    api.createOrGetUser.mockRejectedValue(new Error('network error'));

    render(<UserPicker onUser={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText('Username'), 'alice');
    await userEvent.click(screen.getByRole('button', { name: /let's go/i }));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Try again.')).toBeInTheDocument();
    });
  });
});
