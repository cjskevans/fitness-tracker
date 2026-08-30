import { render, screen } from '@testing-library/react';
import Settings from '../components/Settings';

jest.mock('../api');

const settings = { defaultSetCount: 3, showTimeOfDay: true, darkMode: false };

function renderSettings(props = {}) {
  return render(
    <Settings
      settings={settings}
      onSave={() => {}}
      onBack={() => {}}
      onImported={() => {}}
      {...props}
    />
  );
}

describe('Settings — API documentation link', () => {
  it('links to the Swagger UI docs', () => {
    renderSettings();
    const link = screen.getByRole('link', { name: /open docs/i });
    expect(link).toHaveAttribute('href', '/api/docs');
  });

  it('opens the docs in a new tab without leaking the opener', () => {
    renderSettings();
    const link = screen.getByRole('link', { name: /open docs/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('describes what the link is for', () => {
    renderSettings();
    expect(screen.getByText('API documentation')).toBeInTheDocument();
  });
});
