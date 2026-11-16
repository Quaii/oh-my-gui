# Desktop development

The Tauri 2 shell reuses the production React build and the existing Node API. It starts a private
backend at `127.0.0.1:4319`, then opens the native window only after that process reports readiness.
The ordinary browser app remains available with `npm run dev` / `npm start`.

## Commands

- `npm run desktop:dev` — prepare shared assets and run the native debug shell.
- `npm run desktop:build` — prepare resources and build native packages. Windows also wraps the silent
  NSIS payload in the custom React installer; macOS builds app/DMG and Linux builds deb/AppImage.
- `npm run desktop:installer` — rebuild only the custom Windows wrapper after a complete native build.
- `npm run desktop:prepare` — build the UI and bundle the backend/resources without compiling Rust.
- `npm run desktop:check` — test the prepared backend on an ephemeral loopback port. Checks private
  bootstrap, health, UI assets and shutdown; makes no model requests or file writes.
- `npm run desktop:release-check` — check matching release versions and write installer SHA256SUMS.
- `npm run desktop:icons` — regenerate the packaged desktop icons from `src-tauri/icons/brand.svg`.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check` — check the Rust shell formatting.
- `cargo test --release --locked --manifest-path src-tauri/Cargo.toml` — check native icon geometry
  and the Windows bundled-Node path regression after preparing/building the desktop resources.

Windows development requires Node 24+, Rust/MSVC, Visual Studio C++ build tools and WebView2.
`Cargo.lock` and `package-lock.json` pin dependencies. The current packager copies the build machine's
Node runtime; build on the target OS/architecture. The Node license for that exact version and YAML's
license are included in the generated resources. The existing frontend public license assets are
copied with the web build. Resources, Rust targets and generated schemas are ignored by Git.

## Runtime boundary

The shell launches the bundled Node executable and ESM backend, rather than requiring a system Node
installation. It preserves the backend resource layout for RPC metadata and the persona extension.
Paths passed to the child process are simplified with `dunce` where safe: Tauri's Windows canonical
`\\?\` resource prefix otherwise fails in the bundled Node entry resolver. Server-side real-path scope
checks remain unchanged. Setup failures display a native error before exiting, including failures
raised during the event loop's setup hook.
OMP itself is **not bundled**. First-launch setup detects an existing installation or offers an explicit
installation from the official build service. `OMP_BIN` still overrides discovery.
Git/GitHub-dependent functions still require Git and an existing login, just as in the web version.
No credentials or private chats are packaged.

Desktop navigation commits immediately. The frequent sidebar resize uses a short CSS width transition
instead of taking full blurred-canvas View Transition snapshots. The browser retains its transition-kit
behavior. The native title-bar icon follows validated appearance accents through an authenticated backend
event; this does not rewrite the installed shortcut/executable icon.
Packaged icons use the Carbon accent. The packaged and live window icons share the same centered,
uniformly scaled brand geometry, with transparent outer corners and balanced opposing padding.

The server stays on loopback. A per-launch secret authenticates a window bootstrap via an
HttpOnly, SameSite=Strict cookie; requests without the desktop session or from another origin are
rejected. The bootstrap redirects to `/` and suppresses referrer forwarding. The page has no Tauri
IPC capabilities. Native navigation remains in this origin; HTTP/HTTPS external links open with the
system browser, and other navigation schemes are refused. Stable port and app identity preserve
WebView storage between runs; desktop preferences are separate from existing browser-profile storage.
The custom installer uses a separate private backend on 4320. Cookie names are scoped by port so
opening it cannot invalidate the app session. Only one desktop instance can own port 4319; a second launch fails rather than attaching to an
unverified process. This initial version does not yet focus an existing window on a second launch.

The shell owns backend stdin. Closing it requests graceful OMP/backend shutdown, with a bounded wait
and owned-process-tree termination fallback on Windows. If the parent is terminated, EOF on the pipe
also asks the backend to stop. It never stops the user's separate web development server.

## Current limits and release work

See [TAURI-TASKS.md](TAURI-TASKS.md) for verified milestones. A successful build or backend check does
not establish native rendering, live chat streaming or editor behavior. Those need interactive checks
in the WebView. Do not call the installer publicly release-ready until those checks are recorded.

This is a Windows-first, unsigned development build. Signing, automatic updates, crash/restart UX,
native close handling for unsaved documents and native macOS/Linux acceptance remain release work.
Windows uses a 32px custom title bar with a drag region, double-click maximize/restore and
keyboard-accessible caption buttons. Native window interactions still require interactive verification.
The app and installer explicitly enable native shadows and request rounded outer corners through
Windows 11 DWM before showing their windows. This clips the actual WebView surface, including its
opaque background, rather than rounding only an inner HTML panel. Windows controls corner geometry
when maximized or snapped. Older Windows versions may ignore the corner/border attributes.

Official references: [Tauri resources](https://v2.tauri.app/develop/resources/),
[external binaries](https://v2.tauri.app/develop/sidecar/), and
[WebviewWindowBuilder](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html).

## Installation and initial setup

The user-facing Windows package is `src-tauri/target/release/bundle/custom/omp_0.1.0_x64.exe`.
It silently extracts a temporary copy of the shared Tauri host, Node backend and React assets. This
opens `DesktopInstaller` rather than a standard installer wizard. No installation begins until the
user clicks Install. The fixed per-user destination is `%LOCALAPPDATA%/Programs/omp`; the embedded
NSIS payload manages files, shortcuts, upgrade detection and Windows uninstall registration silently.
Its SHA-256 is checked against the packaged manifest before execution. Both layers remain unsigned;
this integrity check is not a substitute for code signing. The native host blocks closing while the
installation engine is active, and refuses to replace a running app. WebView2 is required to show
the custom UI; clean-device bootstrap and upgrade/uninstall acceptance still need native testing.
The underlying NSIS artifact remains in `bundle/nsis` for diagnostics and silent enterprise installs.

The installer is a compact, fixed 680×460 Carbon window. Its left rail shows actual setup progress;
the adjacent floating panel owns the close/cancel control. It has no theme dropdown or separate
caption strip. First-launch setup uses the same compact rail/panel composition, then expands into the
workspace. Native windows wait for a validated ready/mode event from the committed frontend before
being revealed; a timeout displays a startup error rather than leaving an invisible process.
Carbon is the application
default for new profiles; existing chosen themes remain saved.
An invisible 24px area across the setup window's top edge starts native dragging. The brand and panel
header label also allow dragging, while buttons and form controls are excluded. No title bar is added.

The X and OS close requests share one exit path. After installation starts, a themed confirmation
offers to stay or exit. During NSIS writes, Finish and exit waits for the installation callback before
closing, preserving file replacement/uninstall registration and suppressing the setup launch. It does
not claim to roll back completed writes or force-kill the engine. Preflight checks require the packaged
payload and manifest before offering Install; an extracted host alone is not a distributable installer.

First launch shows three steps using the shared Brand, Button, ThemeSelector and theme tokens:
welcome, OMP connection/installation, and appearance with an optional handoff to Providers. The
workspace does not start a bridge until setup finishes. No provider login, permission change or model
request is performed automatically. Existing OMP configuration is reused. Setup can be reopened from
Settings → Installation without unmounting the workspace or discarding editor drafts.

Completion is versioned in the native app data directory, independently of browser storage. A missing
runtime reopens setup even after completion. The optional OMP download follows the official stable
build-service target/metadata format, streams into a uniquely named temporary executable, verifies the
published SHA-256 and runs `--version` before moving it into the app-managed runtime directory.
No shell install script is executed and PATH is not modified. Existing working installations are
reused. Failed downloads never replace the selected runtime. Linux packages target glibc hosts.

## Native platform builds

`.github/workflows/desktop-build.yml` builds Windows x64, macOS arm64/x64 and Linux
x64 on their respective native runners. It uploads development artifacts to the private repository;
it does not create tags, publish releases or change repository visibility. Platform-specific Tauri
configuration chooses NSIS/custom, DMG/app or deb/AppImage. The matching host Node executable is
packaged, including its license and Unix executable permissions; do not cross-package a Windows Node
binary into a macOS or Linux build. Apple signing/notarization and Windows signing require owner keys.
These workflows establish build coverage only after their actual jobs pass, not native UI acceptance.
Packaging changes pushed to `tauri` trigger builds. Manual dispatch is also declared; GitHub exposes
that control once the workflow exists on the repository's default branch. The preserved baseline is
not modified just to enable that control.
The macOS deployment floor is 13.5, matching the bundled Node 24 runtime rather than advertising
support for older systems on which the backend cannot start.
For unsigned CI builds only, a known `hdiutil` eject/Resource-busy failure falls back to creating and
verifying a DMG directly from the successfully built app and an Applications link. This avoids
mounting another temporary volume; it does not force-eject any disk. Compiler/signing failures still
fail the job. The recovery is disabled when Apple signing/notarization credentials are configured.

## Verified package build

[Run 43836649167](https://github.com/Quaii/omp-frontend/actions/runs/43836649167) passed Windows x64,
macOS arm64, macOS x64 and Linux x64 packaging, all 54 tests, checksum generation and the private
bundled-backend readiness/authentication/health/assets/shutdown checks. The artifacts remain private.
Browser fixture checks covered setup navigation, missing/connected runtime and dark/light themes.
No live OMP installation or model request was made. Native installer launch was blocked by automatic
approval review pending the owner's confirmation; installed-app, upgrade and clean-machine acceptance
remain unverified. The DMG recovery is regression-tested but was not needed in the successful run.

Subsequent local Windows checks fixed the canonical-resource-path startup failure and confirmed the
packaged installer extracts its payload/manifest, exposes a visible welcome window past the startup
watchdog and keeps its backend private (unauthenticated requests return 403). Installation was not
started. A 680×460 inert browser fixture verified the close confirmation, Keep installing, and deferred
Finish and exit behavior. Typecheck, 55 Node tests, four native tests, packaging, backend smoke checks
and checksums passed. Native screenshot access was unavailable; first-frame corner appearance,
installation/upgrade/uninstall and actual OS close interaction still need native acceptance.

For the next release, update package.json, src-tauri/tauri.conf.json and src-tauri/Cargo.toml together,
run the web/native checks, build, and run desktop:release-check. Keep build artifacts out of Git.
Windows signing requires the owner's certificate/signing service; automatic updates additionally need
a protected updater signing key and an approved distribution endpoint. Do not generate placeholder
credentials or publish an unsigned update feed. Other platforms require their own native verification.
