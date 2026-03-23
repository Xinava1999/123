import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = '发生了一些错误，请刷新页面重试。';
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = `数据库错误: ${parsed.error}`;
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-red-500 text-white p-3 border-2 border-black">
                <AlertTriangle size={48} />
              </div>
            </div>
            <h2 className="text-2xl font-black italic tracking-tighter">哎呀，出错了！</h2>
            <p className="font-bold text-gray-600">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-black text-white p-4 font-bold tracking-widest hover:bg-yellow-400 hover:text-black transition-colors border-2 border-black"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
