import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VersionFooter from './VersionFooter';

describe('VersionFooter', () => {
  it('renders commit hash', () => {
    render(
      <MemoryRouter>
        <VersionFooter />
      </MemoryRouter>
    );
    expect(screen.getByText(/(\w{7}|dev)/)).toBeInTheDocument();
  });

  it('has text-9px font-mono class', () => {
    render(
      <MemoryRouter>
        <VersionFooter />
      </MemoryRouter>
    );
    const span = screen.getByText(/(\w{7}|dev)/);
    expect(span.className).toContain('text-[9px]');
    expect(span.className).toContain('font-mono');
  });
});
