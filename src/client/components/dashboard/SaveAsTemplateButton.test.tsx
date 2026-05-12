import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import type { TileConfig, LayoutItem } from '@shared/api/contracts';

const saveMock = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/user-templates', () => ({ saveUserTemplate: saveMock }));

import { SaveAsTemplateButton } from './SaveAsTemplateButton';

const tile: TileConfig = {
  id: 't1', title: 'Bevolking',
  chartType: 'line' as TileConfig['chartType'],
  dataSource: 'bevolking', dimensions: [], defaultGeoLevel: 'gemeente', config: {},
};
const layoutItem: LayoutItem = { i: 't1', x: 0, y: 0, w: 6, h: 4 };

beforeEach(() => {
  saveMock.mockReset();
  cleanup();
});

describe('<SaveAsTemplateButton>', () => {
  it('renders nothing when there are no tiles', () => {
    const { container } = render(<SaveAsTemplateButton tiles={[]} layout={[]} sourceThemeSlug={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('opens the modal on button click', () => {
    render(<SaveAsTemplateButton tiles={[tile]} layout={[layoutItem]} sourceThemeSlug={'wonen'} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /bewaren als template/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('disables submit while the name is empty', () => {
    render(<SaveAsTemplateButton tiles={[tile]} layout={[layoutItem]} sourceThemeSlug={null} />);
    fireEvent.click(screen.getByRole('button', { name: /bewaren als template/i }));
    const submit = screen.getByRole('button', { name: /^opslaan$/i });
    expect(submit).toBeDisabled();
  });

  it('posts the current tiles + layout + chosen visibility, then shows success', async () => {
    saveMock.mockResolvedValueOnce({ id: 'tpl-1', userId: 'u1', organizationId: 'o1', name: 'X', description: null, sourceThemeSlug: 'wonen', tiles: [tile], layout: [layoutItem], visibility: 'org', version: 1, createdAt: 't', updatedAt: 't' });
    render(<SaveAsTemplateButton tiles={[tile]} layout={[layoutItem]} sourceThemeSlug={'wonen'} />);
    fireEvent.click(screen.getByRole('button', { name: /bewaren als template/i }));

    fireEvent.change(screen.getByLabelText(/naam/i), { target: { value: 'Wonen baseline' } });
    fireEvent.change(screen.getByLabelText(/omschrijving/i), { target: { value: 'My snapshot' } });
    fireEvent.click(screen.getByLabelText(/mijn organisatie/i));
    fireEvent.click(screen.getByRole('button', { name: /^opslaan$/i }));

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    expect(saveMock.mock.calls[0][0]).toMatchObject({
      name: 'Wonen baseline',
      description: 'My snapshot',
      sourceThemeSlug: 'wonen',
      visibility: 'org',
      tiles: [tile],
      layout: [layoutItem],
    });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/opgeslagen/i));
  });

  it('renders an error toast when the save call rejects', async () => {
    saveMock.mockRejectedValueOnce(new Error('Boom'));
    render(<SaveAsTemplateButton tiles={[tile]} layout={[layoutItem]} sourceThemeSlug={null} />);
    fireEvent.click(screen.getByRole('button', { name: /bewaren als template/i }));
    fireEvent.change(screen.getByLabelText(/naam/i), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /^opslaan$/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Boom'));
  });
});
