import { useThemes } from '../../contexts/ThemeContext';

export function SupercategoryNav() {
  const { supercategories, activeSupercategory, setActiveSupercategory } = useThemes();

  if (supercategories.length <= 1) return null;

  return (
    <nav className="border-b border-gray-200 bg-white px-4 print:hidden">
      <div className="flex gap-1">
        {supercategories.map(sc => (
          <button
            key={sc.key}
            onClick={() => setActiveSupercategory(sc.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSupercategory === sc.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            style={activeSupercategory === sc.key && sc.color ? { borderColor: sc.color, color: sc.color } : undefined}
          >
            {sc.name}
          </button>
        ))}
      </div>
    </nav>
  );
}
