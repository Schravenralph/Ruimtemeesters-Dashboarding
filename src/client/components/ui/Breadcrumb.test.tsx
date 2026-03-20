import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Breadcrumb } from './Breadcrumb';

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('Breadcrumb', () => {
  it('renders items', () => {
    renderWithRouter(<Breadcrumb items={[{ label: 'Home' }, { label: 'Dashboard' }]} />);
    expect(screen.getByText('Home')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
  });

  it('renders last item as current', () => {
    renderWithRouter(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Current' }]} />);
    const current = screen.getByText('Current');
    expect(current.className).toContain('font-medium');
  });

  it('renders links for non-last items', () => {
    renderWithRouter(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'End' }]} />);
    const link = screen.getByText('Home');
    expect(link.closest('a')).toBeDefined();
  });

  it('has aria navigation label', () => {
    const { container } = renderWithRouter(<Breadcrumb items={[{ label: 'A' }]} />);
    const nav = container.querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('shows separators between items', () => {
    renderWithRouter(<Breadcrumb items={[{ label: 'A' }, { label: 'B' }, { label: 'C' }]} />);
    // Should have 2 separator icons (between 3 items)
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });
});
