import { Plus, X } from 'lucide-react';
import { usePresentations } from '../../contexts/PresentationContext';

/**
 * Tab bar for multiple presentations, matching Primos's tab system.
 * Shows each open presentation as a tab with close button.
 */
export function PresentationTabBar() {
  const { presentations, activeId, setActive, removePresentation, addPresentation } = usePresentations();

  return (
    <div className="flex items-center border-b border-gray-200 bg-white px-4 overflow-x-auto no-print">
      {presentations.map(pres => {
        const isActive = pres.id === activeId;
        return (
          <div
            key={pres.id}
            className={`group flex items-center gap-1 px-3 py-2 text-sm cursor-pointer border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <button
              onClick={() => setActive(pres.id)}
              className="truncate max-w-[180px]"
              title={pres.title}
            >
              {pres.title}
            </button>
            {presentations.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePresentation(pres.id);
                }}
                className={`rounded p-0.5 transition-opacity ${
                  isActive
                    ? 'text-blue-400 hover:text-blue-600 hover:bg-blue-50'
                    : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title="Sluiten"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}

      {presentations.length < 10 && (
        <button
          onClick={() => addPresentation()}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-blue-600 border-b-2 border-transparent"
          title="Nieuwe presentatie"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
