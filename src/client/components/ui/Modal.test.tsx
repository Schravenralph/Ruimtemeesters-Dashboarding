import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Test">Content</Modal>);
    expect(screen.queryByText('Content')).toBeNull();
  });

  it('renders content when open', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Test">Content</Modal>);
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('renders title', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="My Modal">Body</Modal>);
    expect(screen.getByText('My Modal')).toBeDefined();
  });

  it('calls onClose when X button clicked', () => {
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} title="Test">Body</Modal>);

    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[0]); // X button
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} title="Test">Body</Modal>);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
