import React from 'react';
import { AlertTriangle, RefreshCw, Home, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  handleResetDataAndReload = () => {
    try {
      localStorage.clear();
    } catch { /* ignore */ }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'Unexpected application error occurred.';
      const compStack = this.state.errorInfo?.componentStack || '';
      const jsStack = this.state.error?.stack || '';

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Application Interface Notice</h2>
                <p className="text-xs text-slate-400">A view rendering error was intercepted safely.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-rose-300 break-words max-h-36 overflow-y-auto">
              {errorMsg}
            </div>

            <div>
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1 focus:outline-none transition"
              >
                <span>{this.state.showDetails ? 'Hide technical diagnostics' : 'Show technical diagnostics'}</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-2 p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-400 space-y-2 max-h-48 overflow-y-auto">
                  {compStack && (
                    <div>
                      <strong className="text-slate-300 block mb-0.5">Component Hierarchy:</strong>
                      <pre className="whitespace-pre-wrap">{compStack.trim()}</pre>
                    </div>
                  )}
                  {jsStack && (
                    <div>
                      <strong className="text-slate-300 block mb-0.5">Stack Trace:</strong>
                      <pre className="whitespace-pre-wrap text-[10px] text-slate-500">{jsStack.trim()}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleReset}
                className="w-full sm:flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Reset to Home</span>
              </button>
              <button
                onClick={this.handleResetDataAndReload}
                className="w-full sm:w-auto py-2 px-3 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition"
                title="Clears corrupted localStorage cache and re-seeds clean demo data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
