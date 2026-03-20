import { useState } from 'react';
import { Edit3, Check, X } from 'lucide-react';

interface TextTileProps {
  content: string;
  editable?: boolean;
  onChange?: (content: string) => void;
}

/**
 * Text tile for custom dashboards.
 * Mirrors Primos's "Mijn Mosaic" text block feature.
 */
export function TextTile({ content, editable = false, onChange }: TextTileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  function handleSave() {
    onChange?.(editContent);
    setIsEditing(false);
  }

  function handleCancel() {
    setEditContent(content);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-blue-300 bg-white p-4">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="flex-1 resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
          placeholder="Typ hier je tekst..."
          autoFocus
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 rounded px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            <Check className="h-3.5 w-3.5" /> Opslaan
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <X className="h-3.5 w-3.5" /> Annuleren
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 group">
      {editable && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <Edit3 className="h-4 w-4" />
        </button>
      )}
      <div className="text-sm text-gray-700 whitespace-pre-wrap">
        {content || (
          <span className="text-gray-400 italic">
            {editable ? 'Klik om tekst toe te voegen...' : 'Geen inhoud'}
          </span>
        )}
      </div>
    </div>
  );
}
