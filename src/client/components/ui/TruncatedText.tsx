import { useState } from 'react';

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

/**
 * Text component that truncates long content with a "meer" toggle.
 */
export function TruncatedText({ text, maxLength = 150, className = '' }: TruncatedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (text.length <= maxLength) {
    return <p className={`text-sm text-gray-600 ${className}`}>{text}</p>;
  }

  return (
    <p className={`text-sm text-gray-600 ${className}`}>
      {isExpanded ? text : `${text.slice(0, maxLength)}...`}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
      >
        {isExpanded ? 'minder' : 'meer'}
      </button>
    </p>
  );
}
