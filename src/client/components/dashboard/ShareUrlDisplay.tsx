import { Link, Copy, Check, QrCode } from 'lucide-react';
import { useState } from 'react';
import { CopyButton } from '../ui/CopyButton';

interface ShareUrlDisplayProps {
  url: string;
  expiresAt?: string;
}

/**
 * Display a shareable URL with copy functionality.
 * Shows the URL, a copy button, and optional expiry date.
 */
export function ShareUrlDisplay({ url, expiresAt }: ShareUrlDisplayProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Link className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium text-gray-700">Deellink</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={url}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 font-mono"
        />
        <CopyButton text={url} label="Kopieer" />
      </div>

      {expiresAt && (
        <p className="text-xs text-gray-400 mt-2">
          Geldig tot {new Date(expiresAt).toLocaleDateString('nl-NL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}
    </div>
  );
}
