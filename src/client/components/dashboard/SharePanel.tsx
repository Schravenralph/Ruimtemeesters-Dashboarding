import { useState } from 'react';
import { Copy, Check, Link, Code, Mail, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

interface SharePanelProps {
  shareToken: string | null;
  onGenerateLink: () => Promise<void>;
  title: string;
}

export function SharePanel({ shareToken, onGenerateLink, title }: SharePanelProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();

  const shareUrl = shareToken
    ? `${window.location.origin}/shared/${shareToken}`
    : null;

  const embedCode = shareUrl
    ? `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" title="${title}"></iframe>`
    : null;

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      await onGenerateLink();
      showToast('success', 'Deellink aangemaakt (geldig voor 30 dagen)');
    } catch {
      showToast('error', 'Aanmaken deellink mislukt');
    }
    setIsGenerating(false);
  }

  async function copyToClipboard(text: string, type: string) {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    showToast('info', 'Gekopieerd naar klembord');
    setTimeout(() => setCopied(null), 2000);
  }

  if (!shareToken) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600 mb-3">
          Genereer een deellink om dit dashboard te delen met anderen.
          Links zijn 30 dagen geldig.
        </p>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          <Link className="h-4 w-4" />
          {isGenerating ? 'Genereren...' : 'Deellink genereren'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Direct link */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Link className="h-3.5 w-3.5 inline mr-1" />
          Directe link
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl || ''}
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 font-mono"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => copyToClipboard(shareUrl!, 'link')}
          >
            {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Embed code */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Code className="h-3.5 w-3.5 inline mr-1" />
          Embed code (HTML)
        </label>
        <div className="flex gap-2">
          <textarea
            readOnly
            value={embedCode || ''}
            rows={2}
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700 font-mono resize-none"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => copyToClipboard(embedCode!, 'embed')}
          >
            {copied === 'embed' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Share via email */}
      <div>
        <a
          href={`mailto:?subject=${encodeURIComponent(`Dashboard: ${title}`)}&body=${encodeURIComponent(`Bekijk dit dashboard: ${shareUrl}`)}`}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <Mail className="h-4 w-4" />
          Delen via e-mail
        </a>
      </div>

      <p className="text-xs text-gray-400">
        Link verloopt na 30 dagen. Genereer een nieuwe link om de verlooptijd te verlengen.
      </p>
    </div>
  );
}
