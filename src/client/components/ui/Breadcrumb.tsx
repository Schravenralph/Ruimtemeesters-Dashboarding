import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm mb-4">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" aria-hidden="true" />}
          {item.href && index < items.length - 1 ? (
            <Link to={item.href} className="text-gray-500 hover:text-blue-600">
              {item.label}
            </Link>
          ) : (
            <span className={index === items.length - 1 ? 'font-medium text-gray-900' : 'text-gray-500'}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
