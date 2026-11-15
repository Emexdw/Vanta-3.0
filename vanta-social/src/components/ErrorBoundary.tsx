import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

type State = { failed: boolean };

/** Prevents a rendering error from leaving the entire application blank. */
export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Do not send session tokens, profile data or private messages to logs.
    if (import.meta.env.DEV) console.error('VANTA render error', error.name, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main role="alert" className="min-h-screen bg-[#09090b] text-white flex items-center justify-center px-6">
        <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900/70 p-8 text-center shadow-2xl">
          <AlertTriangle aria-hidden="true" className="mx-auto mb-4 h-8 w-8 text-violet-300" />
          <h1 className="text-xl font-semibold">Algo salió mal</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">No pudimos mostrar esta pantalla. Podés volver a intentar sin perder tu cuenta.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300">
            <RotateCcw aria-hidden="true" className="h-4 w-4" /> Recargar VANTA
          </button>
        </section>
      </main>
    );
  }
}
