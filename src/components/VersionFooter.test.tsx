import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VersionFooter from './VersionFooter';

describe('VersionFooter', () => {
  it('renders a fallback label', () => {
    render(
      <MemoryRouter>
        <VersionFooter />
      </MemoryRouter>
    );
    expect(screen.getByText('dev')).toBeInTheDocument();
  });

  it('has text-11px font-mono class', () => {
    render(
      <MemoryRouter>
        <VersionFooter />
      </MemoryRouter>
    );
    const span = screen.getByText('dev');
    expect(span.className).toContain('text-[11px]');
    expect(span.className).toContain('font-mono');
  });
});
