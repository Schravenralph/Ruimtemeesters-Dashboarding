import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-red-200 bg-red-50">
          <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
          <h2 className="text-lg font-semibold text-red-900 mb-1">Er is iets misgegaan</h2>
          <p className="text-sm text-red-700 mb-4 text-center max-w-md">
            {this.state.error?.message || 'Onverwachte fout opgetreden'}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RefreshCw className="h-4 w-4" />
            Opnieuw proberen
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
