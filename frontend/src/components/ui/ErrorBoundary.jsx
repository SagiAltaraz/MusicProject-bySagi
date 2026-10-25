import { Component } from 'react';

// Keeps one broken view from blanking the whole app (the player keeps playing)
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('View crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-lg font-semibold text-text-primary">Something broke on this page</p>
        <p className="text-sm text-text-secondary mt-2">{String(this.state.error.message || this.state.error)}</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-6 px-4 py-2 rounded-lg bg-accent text-white border-none text-sm font-medium"
        >
          Try again
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
