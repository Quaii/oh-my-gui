import type { MouseEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Brand } from './Brand';
import { Button } from './ui/button';
import { post } from '../lib/api';

export function DesktopSetupFrame({ steps, current, busy, onCancel, children, allowCancelWhileBusy = false }: {
  steps: string[]; current: number; busy: boolean; onCancel: () => void; children: ReactNode; allowCancelWhileBusy?: boolean;
}) {
  const startDrag = (event: MouseEvent<HTMLElement>) => {
    if (!window.__OMP_CUSTOM_CHROME__ || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select')) return;
    event.preventDefault();
    void post('/api/desktop/window', { action: 'drag' }).catch(() => {});
  };

  return <div className="desktop-setup-layout">
    {window.__OMP_CUSTOM_CHROME__ && <div className="desktop-setup-grab-area" aria-hidden="true" onMouseDown={startDrag} />}
    <aside className="desktop-setup-sidebar" aria-label="Setup progress">
      <div className="desktop-setup-brand" onMouseDown={startDrag}><Brand /><div><strong>omp.</strong><span>Setup</span></div></div>
      <ol role="list">{steps.map((label, index) => <li key={label} data-state={index < current ? 'complete' : index === current ? 'current' : 'pending'} aria-current={index === current ? 'step' : undefined}>
        <span className="desktop-setup-step-marker" aria-hidden="true" />
        <span className="desktop-setup-step-label">{label}</span>
        {index < current && <span className="sr-only">Completed</span>}
      </li>)}</ol>
    </aside>
    <main className="desktop-setup workspace-floating-surface" aria-busy={busy}>
      <div className="desktop-setup-panel-header" onMouseDown={startDrag}><span>{steps[current]}</span><Button variant="ghost" size="icon-sm" disabled={busy && !allowCancelWhileBusy} aria-label={window.__OMP_INSTALLER__ ? 'Cancel installation' : 'Close setup'} title={busy && !allowCancelWhileBusy ? 'Wait for the current operation to finish' : 'Close setup'} onClick={onCancel}><X className="size-4" /></Button></div>
      {children}
    </main>
  </div>;
}
