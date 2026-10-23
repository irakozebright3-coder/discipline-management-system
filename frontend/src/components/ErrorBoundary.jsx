import { Component } from 'react';

// Full-app error boundary: renders a readable crash screen instead of a
// blank page when a React render error happens anywhere in the tree.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI crash', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
          <h1 className="text-lg font-bold">Something went wrong</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This screen crashed instead of loading. The details below help fix it.
          </p>
          <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap text-foreground">
            {String(error?.message || error)}
          </pre>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Reload the page
            </button>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
