import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VersionFooter from './VersionFooter';

const g = globalThis as Record<string, unknown>;

afterEach(() => {
  delete g.__VERSION__;
  delete g.__COMMIT_HASH__;
});

describe('VersionFooter', () => {
  it('renders fallback when no build metadata is present', () => {
    render(
      <MemoryRouter>
        <VersionFooter />
      </MemoryRouter>
    );
    expect(screen.getByText('dev')).toBeInTheDocument();
  });

  it('renders version · commit when both are present', () => {
    g.__VERSION__ = '1.14.0';
    g.__COMMIT_HASH__ = '824a6be';
    render(
      <MemoryRouter>
        <VersionFooter />
      </MemoryRouter>
    );
    expect(screen.getByText('v1.14.0 · 824a6be')).toBeInTheDocument();
  });

  it('renders only commit when version is missing', () => {
    g.__COMMIT_HASH__ = '824a6be';
    render(
      <MemoryRouter>
        <VersionFooter />
      </MemoryRouter>
    );
    expect(screen.getByText('824a6be')).toBeInTheDocument();
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
