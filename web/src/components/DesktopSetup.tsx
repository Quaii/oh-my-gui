import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { ThemeSelector } from './ui/theme-selector';
import { DesktopSetupFrame } from './DesktopSetupFrame';
import { APP_THEMES, applyTheme, getTheme } from '../lib/theme';
import { get, post } from '../lib/api';
import { navigate } from '../lib/route';

type SetupStatus = { completed: boolean; available: boolean; version: string | null; executable: string; installSupported: boolean };

export function DesktopSetup({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [ready, setReady] = useState(false);
  const [activated, setActivated] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(getTheme);

  async function refresh(initial = false) {
    setBusy(true); setError('');
    try {
      const value = await get<SetupStatus>('/api/desktop/setup');
      setStatus(value);
      if (initial && value.completed && value.available) { setActivated(true); setReady(true); }
    } catch (error: any) { setError(error.message); }
    finally { setBusy(false); }
  }

  useEffect(() => { void refresh(true); }, []);
  useEffect(() => {
    const reopen = () => { setTheme(getTheme()); setReady(false); setStep(0); void refresh(); };
    window.addEventListener('omp:desktop-setup', reopen);
    return () => window.removeEventListener('omp:desktop-setup', reopen);
  }, []);

  async function install() {
    setBusy(true); setError('');
    try { setStatus(await post<SetupStatus>('/api/desktop/setup/install', {})); }
    catch (error: any) { setError(error.message); }
    finally { setBusy(false); }
  }

  async function finish(providers: boolean) {
    setBusy(true); setError('');
    try {
      await post('/api/desktop/setup', {});
      if (providers) {
        localStorage.setItem('ompfe.settings.panel', 'providers');
        window.dispatchEvent(new Event('omp:settings-panel'));
        navigate('/settings');
      }
      setActivated(true); setReady(true);
    } catch (error: any) { setError(error.message); }
    finally { setBusy(false); }
  }

  return <><div hidden={!ready} className="h-full min-h-0">{activated && children}</div>{!ready && <DesktopSetupFrame steps={['Welcome', 'OMP runtime', 'Appearance']} current={step} busy={busy} onCancel={() => {
    if (activated) setReady(true);
    else void post('/api/desktop/window', { action: 'close' }).catch(error => setError(error.message));
  }}>
      {step === 0 && <section>
        <h1 id="setup-title">Set up omp.</h1>
        <p>Connect your agent and choose your appearance.</p>
        <div className="desktop-setup-inset"><h2>Bring your work with you</h2><p>Existing OMP chats, providers and settings stay where they are. You can add a project from Home when you’re ready.</p></div>
      </section>}
      {step === 1 && <section>
        <h1 id="setup-title">Connect your agent.</h1>
        <p>OMP runs locally and powers your conversations and tools.</p>
        <div className="desktop-setup-inset">
          <div className="flex items-center gap-3">{status?.available ? <Check className="size-5 text-primary" /> : <Download className="size-5 text-muted-foreground" />}<h2>{status?.available ? 'OMP is ready' : busy ? 'Checking your runtime…' : 'Install or connect OMP'}</h2></div>
          {status?.available ? <><p>{status.version}</p><code className="block break-all text-xs text-muted-foreground">{status.executable}</code></> : <p>Install the official stable binary for this device. The download is verified before it is used. Your system installation and PATH stay unchanged.</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {!status?.available && <Button onClick={install} disabled={busy || !status?.installSupported}><Download className="size-4" />{busy ? 'Working…' : 'Install OMP'}</Button>}
            <Button variant="outline" onClick={() => void refresh()} disabled={busy}><RefreshCw className="size-4" />Check again</Button>
            <Button variant="ghost" asChild><a href="https://github.com/can1357/oh-my-pi#install" target="_blank" rel="noreferrer">Installation guide</a></Button>
          </div>
        </div>
      </section>}
      {step === 2 && <section>
        <h1 id="setup-title">Make it yours.</h1>
        <p>Choose a starting theme. Every detail can be changed in Appearance later.</p>
        <div className="desktop-setup-themes"><ThemeSelector className="grid grid-cols-3 gap-5 p-2" itemClassName="w-full" themes={APP_THEMES} value={theme} onChange={value => { setTheme(value); applyTheme(value); }} /></div>
        <p className="text-xs">Next, connect a provider in Settings or continue with your existing configuration. No model requests are made during setup.</p>
      </section>}
      {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
      {!status && <Button variant="outline" className="mt-5" onClick={() => void refresh()} disabled={busy}>{busy ? 'Checking setup…' : 'Retry connection'}</Button>}
      <footer className="desktop-setup-navigation">
        <Button variant="ghost" onClick={() => setStep(value => value - 1)} disabled={busy || step === 0}><ArrowLeft className="size-4" />Back</Button>
        {step < 2 ? <Button onClick={() => setStep(value => value + 1)} disabled={busy || !status || (step === 1 && !status.available)}>Continue<ArrowRight className="size-4" /></Button> : <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void finish(false)}>Open workspace</Button><Button disabled={busy} onClick={() => void finish(true)}>Connect a provider<ArrowRight className="size-4" /></Button></div>}
      </footer>
  </DesktopSetupFrame>}</>;
}
