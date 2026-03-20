import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoBox } from './InfoBox';

describe('InfoBox', () => {
  it('renders content', () => {
    render(<InfoBox>Test message</InfoBox>);
    expect(screen.getByText('Test message')).toBeDefined();
  });

  it('renders with title', () => {
    render(<InfoBox title="Important">Content</InfoBox>);
    expect(screen.getByText('Important')).toBeDefined();
  });

  it('renders info variant by default', () => {
    const { container } = render(<InfoBox>Info</InfoBox>);
    expect(container.firstElementChild?.className).toContain('bg-blue-50');
  });

  it('renders warning variant', () => {
    const { container } = render(<InfoBox variant="warning">Warn</InfoBox>);
    expect(container.firstElementChild?.className).toContain('bg-yellow-50');
  });

  it('renders error variant', () => {
    const { container } = render(<InfoBox variant="error">Error</InfoBox>);
    expect(container.firstElementChild?.className).toContain('bg-red-50');
  });

  it('renders success variant', () => {
    const { container } = render(<InfoBox variant="success">OK</InfoBox>);
    expect(container.firstElementChild?.className).toContain('bg-green-50');
  });

  it('shows dismiss button when dismissible', () => {
    const onDismiss = vi.fn();
    render(<InfoBox dismissible onDismiss={onDismiss}>Dismiss me</InfoBox>);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onDismiss when dismissed', () => {
    const onDismiss = vi.fn();
    render(<InfoBox dismissible onDismiss={onDismiss}>Dismiss</InfoBox>);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onDismiss).toHaveBeenCalled();
  });
});
