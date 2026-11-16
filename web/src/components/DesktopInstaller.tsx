import { useEffect, useState } from 'react';
import { ArrowRight, Check, Download, LoaderCircle } from 'lucide-react';
import { DesktopSetupFrame } from './DesktopSetupFrame';
import { Button } from './ui/button';
import { get, post } from '../lib/api';

type InstallerStatus = { destination: string; installed: boolean; installing: boolean };
export function DesktopInstaller() {
  const [status, setStatus] = useState<InstallerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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

  async function cancel() {
    try { await post('/api/desktop/window', { action: 'close' }); }
    catch (error: any) { setError(error.message); }
  }
  return <DesktopSetupFrame steps={['Install app', 'Open setup']} current={status?.installed ? 1 : 0} busy={busy} onCancel={() => void cancel()}>
      <section>
        <h1 id="installer-title">{status?.installed ? 'Installation complete' : 'Install omp.'}</h1>
        <p>{status?.installed ? 'Continue to set up OMP and connect your providers.' : 'Install for your account. Existing chats and settings are kept when upgrading.'}</p>
        <div className="desktop-setup-inset">
          <div className="flex items-center gap-3">{busy ? <LoaderCircle className="size-5 animate-spin text-primary motion-reduce:animate-none" /> : status?.installed ? <Check className="size-5 text-primary" /> : <Download className="size-5 text-muted-foreground" />}<h2>{busy ? 'Installing omp.…' : status?.installed ? 'Installed for your account' : 'Install for your account'}</h2></div>
          <p className="break-all">{status?.destination || 'Checking installation location…'}</p>
          <p>{busy ? 'Keep this window open while the files and shortcuts are installed.' : 'No administrator access is needed. You can uninstall from Windows Settings.'}</p>
        </div>
      </section>
      {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
      <footer>{!status && error ? <Button variant="outline" onClick={() => void load()}>Retry</Button> : <Button disabled={busy || !status} onClick={() => void action(status?.installed ? 'launch' : 'install')}>{busy ? 'Installing…' : status?.installed ? 'Open setup' : 'Install omp.'}<ArrowRight className="size-4" /></Button>}</footer>
  </DesktopSetupFrame>;
}
