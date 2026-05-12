import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import type { ThemeConfig, UserTemplate } from '@shared/api/contracts';

const listMock = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/user-templates', () => ({
  listUserTemplates: listMock,
}));

import { TemplateGalleryStep, type GallerySelection } from './TemplateGalleryStep';

const wonen: ThemeConfig = {
  id: 'th-wonen', name: 'Wonen', slug: 'wonen', description: 'Wonen', icon: '🏠',
  tiles: [], order: 0, isSystem: true, supercategory: 'wonen',
};
const energie: ThemeConfig = {
  id: 'th-energie', name: 'Energie', slug: 'energie', description: 'Energie', icon: '⚡',
  tiles: [], order: 1, isSystem: true, supercategory: 'duurzaamheid',
};
const tpl: UserTemplate = {
  id: 'tpl-1', userId: 'u1', organizationId: 'o1', name: 'Mijn Wonen Snapshot',
  description: 'A baseline I tuned',
  sourceThemeSlug: 'wonen', tiles: [
    { id: 't1', title: 'Bevolking', chartType: 'line' as ThemeConfig['tiles'][number]['chartType'], dataSource: 'bevolking', dimensions: [], defaultGeoLevel: 'gemeente', config: {} },
    { id: 't2', title: 'Huishoudens', chartType: 'bar' as ThemeConfig['tiles'][number]['chartType'], dataSource: 'huishoudens', dimensions: [], defaultGeoLevel: 'gemeente', config: {} },
  ], layout: [], visibility: 'private', version: 1, createdAt: 't', updatedAt: 't',
};

beforeEach(() => { listMock.mockReset(); cleanup(); });

describe('<TemplateGalleryStep>', () => {
  it('renders the Systeem tab by default with grouped themes', () => {
    render(<TemplateGalleryStep themes={[wonen, energie]} selection={{ kind: 'none' }} onSelect={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Systeem' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /Wonen/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Energie/ })).toBeInTheDocument();
    expect(listMock).not.toHaveBeenCalled();
  });

  it('selecting a system theme calls onSelect with kind=theme', () => {
    const onSelect = vi.fn();
    render(<TemplateGalleryStep themes={[wonen]} selection={{ kind: 'none' }} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Wonen/ }));
    expect(onSelect).toHaveBeenCalledWith({ kind: 'theme', themeSlug: 'wonen' });
  });

  it('switching to Mijn fetches templates and renders them with tile/source hints', async () => {
    listMock.mockResolvedValueOnce([tpl]);
    render(<TemplateGalleryStep themes={[wonen]} selection={{ kind: 'none' }} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Mijn' }));
    await waitFor(() => expect(listMock).toHaveBeenCalledWith('mine'));
    expect(await screen.findByText('Mijn Wonen Snapshot')).toBeInTheDocument();
    expect(screen.getByText(/2 tegels/)).toBeInTheDocument();
    expect(screen.getByText(/2 databronnen/)).toBeInTheDocument();
  });

  it('selecting a user template calls onSelect with kind=template', async () => {
    listMock.mockResolvedValueOnce([tpl]);
    const onSelect = vi.fn();
    render(<TemplateGalleryStep themes={[wonen]} selection={{ kind: 'none' }} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Mijn' }));
    const tplButton = await screen.findByRole('button', { name: /Mijn Wonen Snapshot/ });
    fireEvent.click(tplButton);
    expect(onSelect).toHaveBeenCalledWith({ kind: 'template', userTemplateId: 'tpl-1' });
  });

  it('Mijn tab with no templates shows an empty hint', async () => {
    listMock.mockResolvedValueOnce([]);
    render(<TemplateGalleryStep themes={[wonen]} selection={{ kind: 'none' }} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Mijn' }));
    expect(await screen.findByText(/Bewaren als template/)).toBeInTheDocument();
  });

  it('surfaces fetch errors via an alert role', async () => {
    listMock.mockRejectedValueOnce(new Error('Network down'));
    render(<TemplateGalleryStep themes={[wonen]} selection={{ kind: 'none' }} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Publiek' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
  });
});
