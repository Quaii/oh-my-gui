import { useState } from "react";
import { Button } from "../ui/button";
export function ProviderAccounts({
  providerId,
  cmd,
}: {
  providerId: string;
  cmd: (command: any) => Promise<any>;
}) {
  const [accounts, setAccounts] = useState<any[] | null>(null),
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
  return (
    <div className="py-2">
      <Button
        size="xs"
        variant="ghost"
        disabled={busy}
        onClick={() => (accounts ? setAccounts(null) : void refresh())}
      >
        {accounts ? "Hide accounts" : "Manage accounts"}
      </Button>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {accounts && (
        <div className="mt-2 space-y-2">
          {!accounts.length && (
            <p className="text-xs text-muted-foreground">
              No stored accounts. Environment credentials are managed outside
              OMP.
            </p>
          )}
          {accounts.map((account) => (
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
        </div>
      )}
    </div>
  );
}
