import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-8 text-center">
            <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-8 max-w-lg">
                <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
                <p className="text-gray-300 mb-6">
                    The application encountered an unexpected error. Please try refreshing the page.
                </p>
                {this.state.error && (
                    <pre className="text-left bg-black/50 p-4 rounded text-xs text-red-200 overflow-auto max-h-40 mb-6 font-mono">
                        {this.state.error.toString()}
                    </pre>
                )}
                <button
                    onClick={() => window.location.reload()}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded transition-colors"
                >
                    Refresh Page
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
