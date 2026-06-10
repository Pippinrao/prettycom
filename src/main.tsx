import { Component, type ErrorInfo, type ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const UI_STATE_KEY = 'prettycom-ui-state'

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PrettyCOM render error', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-foreground">
          <h1 className="text-lg font-semibold">PrettyCOM failed to load</h1>
          <p className="max-w-lg text-center text-sm text-muted-foreground">
            {this.state.error.message}
          </p>
          <button
            type="button"
            className="rounded-lg border border-border bg-muted px-4 py-2 text-sm hover:bg-accent"
            onClick={() => {
              localStorage.removeItem(UI_STATE_KEY)
              location.reload()
            }}
          >
            Reset saved UI state and reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
