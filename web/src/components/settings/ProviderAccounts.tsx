import { useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { ProviderIcon } from "../ProviderIcon";
import { post } from "../../lib/api";

export type LoginProvider = { id: string; name: string; available: boolean; authenticated: boolean };
type StoredAccount = { credentialId: number; label: string; detail: string; type: string; active?: boolean };

export function ProviderAccounts({
  provider,
  cwd,
  cmd,
  loginBusy,
  onSignIn,
  onCredentialsChanged,
}: {
  provider: LoginProvider;
  cwd: string;
  cmd: (command: any) => Promise<any>;
  loginBusy: boolean;
  onSignIn: (providerId: string) => Promise<boolean>;
  onCredentialsChanged: () => void;
}) {
  const providerId = provider.id === 'zai-coding-plan' ? 'zai' : provider.id;
  const [open, setOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [terminalFallback, setTerminalFallback] = useState(false);
  const [accounts, setAccounts] = useState<StoredAccount[] | null>(null),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null),
    [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const response = await cmd({ type: "get_logout_accounts", providerId });
      if (!response.ok) throw Error(response.error);
      setAccounts(response.data.accounts ?? []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function signIn() {
    setError('');
    setSigningIn(true);
    setTerminalFallback(false);
    try {
      if (await onSignIn(provider.id) && open) await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed.';
      setTerminalFallback(/secret input|interactive prompts|terminal UI|terminal to log in/i.test(message) || provider.id === 'zai-coding-plan');
      setError(message);
    } finally {
      setSigningIn(false);
    }
  }

  async function openTerminal() {
    try {
      await post('/api/native/operations', { action: 'terminal-launch', path: ['login'], positionals: [providerId], cwd });
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not open the OMP terminal.');
    }
  }
  return (
    <Collapsible className="provider-account-card settings-card" open={open} onOpenChange={next => {
      setOpen(next);
      setSelected(null);
      if (next) void refresh();
    }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ProviderIcon provider={provider.id} className="size-6" />
        <div className="min-w-0 flex-1">
          <div className="setting-label truncate">{provider.name}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{provider.id}</div>
        </div>
        {(provider.authenticated || open || provider.available) && <div className="flex shrink-0 items-center gap-2">
          {(provider.authenticated || open) && (
            <CollapsibleTrigger asChild>
              <Button size="xs" variant="ghost" className="provider-manage-trigger">
                {open ? "Hide accounts" : "Manage accounts"}
              </Button>
            </CollapsibleTrigger>
          )}
          <div className="flex min-w-17 justify-end">
            {provider.authenticated ? <Badge>{signingIn ? "Signing in…" : "Signed in"}</Badge>
              : provider.available && (
                <Button size="xs" variant="outline" onClick={() => void signIn()} disabled={loginBusy || signingIn}>
                  {signingIn ? "Signing in…" : "Sign in"}
                </Button>
              )}
          </div>
        </div>}
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {terminalFallback && <Button size="xs" variant="outline" className="mt-2" onClick={() => void openTerminal()}>
        {provider.id === 'zai-coding-plan' ? 'Use a Z.AI API key in the OMP terminal' : 'Sign in in the OMP terminal'}
      </Button>}
      <CollapsibleContent className="space-y-2 pt-3">
          {busy && !accounts && <p className="text-xs text-muted-foreground" role="status">Loading accounts…</p>}
          {accounts?.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No stored accounts. Environment credentials are managed outside
              OMP.
            </p>
          )}
          {accounts?.map((account) => (
            <div
              key={account.credentialId}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p>
                  {account.label}
                  {account.active ? " · active for this session" : ""}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {account.detail} · {account.type}
                </p>
              </div>
              {selected === account.credentialId ? (
                <>
                  <span>Sign out of this account?</span>
                  <Button
                    size="xs"
                    variant="destructive"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const response = await cmd({
                          type: "logout",
                          providerId,
                          credentialId: account.credentialId,
                        });
                        if (!response.ok) throw Error(response.error);
                        setSelected(null);
                        onCredentialsChanged();
                        await refresh();
                      } catch (error: any) {
                        setError(error.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Sign out
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setSelected(null)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setSelected(account.credentialId)}
                >
                  Sign out
                </Button>
              )}
            </div>
          ))}
          {provider.available && provider.authenticated && <Button size="xs" variant="ghost" onClick={() => void signIn()} disabled={loginBusy || signingIn || busy}>
            Add another account
          </Button>}
      </CollapsibleContent>
    </Collapsible>
  );
}
