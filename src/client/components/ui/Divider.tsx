interface DividerProps {
  text?: string;
  className?: string;
}

export function Divider({ text, className = '' }: DividerProps) {
  if (text) {
    return (
      <div className={`flex items-center gap-3 my-4 ${className}`}>
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-xs text-gray-400 font-medium uppercase">{text}</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>
    );
  }

  return <hr className={`border-gray-200 my-4 ${className}`} />;
}
