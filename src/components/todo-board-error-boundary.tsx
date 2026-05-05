import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type Props = { children: ReactNode };

type State = { error: Error | null };

function isLikelyStaleChunkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  );
}

/**
 * Catches React render errors (e.g. stale Vite chunk after `astro dev` restart) so the page
 * can recover instead of staying blank.
 */
export class TodoBoardErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[TodoBoard] render error', error.message, info.componentStack?.slice(0, 500));
  }

  render() {
    if (this.state.error) {
      const stale = isLikelyStaleChunkError(this.state.error);
      return (
        <div
          role="alert"
          className="border-border/80 bg-muted/30 text-muted-foreground mx-auto max-w-md space-y-4 rounded-2xl border px-5 py-6 text-center text-sm"
        >
          <p className="text-foreground font-medium">
            {stale ? 'This tab is out of date with the dev server.' : 'Something went wrong loading your list.'}
          </p>
          <p className="text-xs leading-relaxed">
            {stale
              ? 'After restarting `npm run dev`, refresh once. If errors persist, try a hard refresh or disable browser extensions that inject scripts on localhost.'
              : 'Try refreshing the page. If the problem continues, sign out and back in.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" size="sm" className="rounded-xl font-semibold" onClick={() => location.reload()}>
              Refresh page
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
