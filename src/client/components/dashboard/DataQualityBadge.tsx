import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface DataQualityBadgeProps {
  completeness: number;
  source: string;
}

export function DataQualityBadge({ completeness, source }: DataQualityBadgeProps) {
  const isGood = completeness >= 95;
  const isWarning = completeness >= 70 && completeness < 95;
  const isBad = completeness < 70;

  const Icon = isGood ? CheckCircle : isWarning ? AlertTriangle : Activity;
  const color = isGood ? 'text-green-500' : isWarning ? 'text-yellow-500' : 'text-red-500';
  const bgColor = isGood ? 'bg-green-50' : isWarning ? 'bg-yellow-50' : 'bg-red-50';
  const label = isGood ? 'Goed' : isWarning ? 'Matig' : 'Laag';

  return (
    <Tooltip content={`Datakwaliteit ${source}: ${completeness}% volledig`}>
      <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${bgColor} ${color}`}>
        <Icon className="h-3 w-3" />
        <span className="font-medium">{label}</span>
        <span className="opacity-75">{completeness}%</span>
      </div>
    </Tooltip>
  );
}
