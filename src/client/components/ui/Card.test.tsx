import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content here</Card>);
    expect(screen.getByText('Content here')).toBeDefined();
  });

  it('applies padding by default', () => {
    const { container } = render(<Card>Padded</Card>);
    expect(container.firstElementChild?.className).toContain('p-6');
  });

  it('removes padding when padding=false', () => {
    const { container } = render(<Card padding={false}>No padding</Card>);
    expect(container.firstElementChild?.className).not.toContain('p-6');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Custom</Card>);
    expect(container.firstElementChild?.className).toContain('custom-class');
  });
});

describe('CardHeader', () => {
  it('renders title', () => {
    render(<CardHeader title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeDefined();
  });

  it('renders subtitle', () => {
    render(<CardHeader title="Title" subtitle="Subtitle text" />);
    expect(screen.getByText('Subtitle text')).toBeDefined();
  });

  it('renders actions', () => {
    render(<CardHeader title="Title" actions={<button>Action</button>} />);
    expect(screen.getByText('Action')).toBeDefined();
  });
});
