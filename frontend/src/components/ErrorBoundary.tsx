import { Component, ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-500 text-center">Something went wrong.</div>;
    }
    return this.props.children;
  }
} 