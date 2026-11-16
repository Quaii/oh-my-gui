import { useEffect, useState } from 'react';
import { ArrowRight, Check, Download, LoaderCircle } from 'lucide-react';
import { Brand } from './Brand';
import { WorkspaceBackground } from './Appearance';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { APP_THEMES, applyTheme, getTheme } from '../lib/theme';
import { get, post } from '../lib/api';

type InstallerStatus = { destination: string; installed: boolean; installing: boolean };
export function DesktopInstaller() {
  const [status, setStatus] = useState<InstallerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(getTheme);
  const load = () => get<InstallerStatus>('/api/desktop/installer').then(setStatus).catch(error => setError(error.message));
  useEffect(() => { void load(); }, []);

  async function action(kind: 'install' | 'launch') {
    setBusy(true); setError('');
    window.dispatchEvent(new CustomEvent('omp:installer-busy', { detail: true }));
    try {
      setStatus(await post<InstallerStatus>('/api/desktop/installer', { action: kind }));
      if (kind === 'launch') await post('/api/desktop/window', { action: 'close' });
    } catch (error: any) { setError(error.message); }
    finally {
      setBusy(false);
      window.dispatchEvent(new CustomEvent('omp:installer-busy', { detail: false }));
    }
  }

  return <div className="desktop-setup-shell">
    <WorkspaceBackground />
    <main className="desktop-setup workspace-floating-surface" aria-labelledby="installer-title" aria-busy={busy}>
      <div className="mb-8 flex items-center gap-3"><Brand /><span className="text-lg font-semibold">omp.</span><div className="ml-auto"><Select value={theme} onValueChange={value => { applyTheme(value); setTheme(value); }}><SelectTrigger aria-label="Installer theme" className="w-32"><SelectValue /></SelectTrigger><SelectContent>{APP_THEMES.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div></div>
      <section>
        <h1 id="installer-title">{status?.installed ? 'Your workspace is ready.' : 'A home for your best work.'}</h1>
        <p>{status?.installed ? 'Open omp. to connect your agent and make it yours.' : 'Install omp. on this device. Your conversations, settings and projects stay with you when upgrading.'}</p>
        <div className="desktop-setup-inset">
          <div className="flex items-center gap-3">{busy ? <LoaderCircle className="size-5 animate-spin text-primary motion-reduce:animate-none" /> : status?.installed ? <Check className="size-5 text-primary" /> : <Download className="size-5 text-muted-foreground" />}<h2>{busy ? 'Installing omp.…' : status?.installed ? 'Installed for your account' : 'Install for your account'}</h2></div>
          <p className="break-all">{status?.destination || 'Checking installation location…'}</p>
          <p>{busy ? 'Keep this window open while the files and shortcuts are installed.' : 'No administrator access is needed. You can uninstall from Windows Settings.'}</p>
        </div>
      </section>
      {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
      <footer className="mt-8 flex justify-end gap-3">{!status && error ? <Button variant="outline" onClick={() => void load()}>Retry</Button> : <Button disabled={busy || !status} onClick={() => void action(status?.installed ? 'launch' : 'install')}>{busy ? 'Installing…' : status?.installed ? 'Open omp.' : 'Install omp.'}<ArrowRight className="size-4" /></Button>}</footer>
    </main>
  </div>;
}
