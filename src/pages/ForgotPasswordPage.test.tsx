import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from './ForgotPasswordPage';

vi.mock('../api/client', () => ({
  forgotPassword: vi.fn(),
}));

import { forgotPassword } from '../api/client';
const mockForgotPassword = forgotPassword as ReturnType<typeof vi.fn>;

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders form', () => {
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeInTheDocument();
  });

  it('shows success message after submit', async () => {
    mockForgotPassword.mockResolvedValueOnce({ message: 'ok' });
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Email'), 'a@a.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    await waitFor(() => {
      expect(screen.getByText(/recibiras un enlace/i)).toBeInTheDocument();
    });
  });
});
