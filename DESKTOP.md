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

This is a Windows-first, unsigned development build. Live signed release delivery, OS code signing,
upgrade/rollback acceptance and native macOS/Linux acceptance remain release work.
Windows integrates keyboard-accessible caption controls into the existing floating workspace, editor
and Settings toolbars, without a separate title-bar row. Free header space supports dragging and
double-click maximize/restore. Native window interactions still require interactive verification.
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
installation engine is active. When the installed app is running, the installer asks before ending
its sessions, then uses Windows Restart Manager to close the installed app and waits for the bundled
backend to release its files. The same installer window continues the update. WebView2 is required to show
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
runtime reopens setup even after completion. On macOS, setup checks Homebrew, the standalone
installer and Bun paths even when launched from Finder, and uses the physical CPU architecture
on Apple Silicon if the app is running under Rosetta. Linux setup checks system and per-user
Linuxbrew paths, the standalone installer and Bun even when launched from the application menu.
Setup polls for download progress and keeps failures visible beside its navigation. The optional
OMP download follows the official stable
build-service target/metadata format, streams into a uniquely named temporary executable, verifies the
published SHA-256 and runs `--version` before moving it into the app-managed runtime directory.
The app leaves the system and shell configuration intact. Existing working installations are
reused. Failed downloads never replace the selected runtime. Linux packages target glibc hosts.

## Native platform builds

`.github/workflows/desktop-build.yml` builds Windows x64, macOS arm64/x64 and Linux
x64 on their respective native runners. It uploads development artifacts to the private repository;
it does not create tags, publish releases or change repository visibility. Platform-specific Tauri
configuration chooses NSIS/custom, DMG/app or deb/AppImage. The Mac disk image contains
`Oh My GUI.app`. Linux packages and their launcher use the Oh My GUI name. The matching host Node
executable is packaged with its license and Unix executable permissions. Do not cross-package a Windows Node
binary into a macOS or Linux build. Apple signing/notarization and Windows signing require owner keys.
These workflows establish build coverage only after their actual jobs pass, not native UI acceptance.
Packaging changes pushed to `tauri` trigger builds. Manual dispatch is also declared; GitHub exposes
that control once the workflow exists on the repository's default branch. The preserved baseline is
not modified just to enable that control.
The macOS deployment floor is 13.5, matching the bundled Node 24 runtime rather than advertising
support for older systems on which the backend cannot start.
Mac previews use ad-hoc signing. The preview workflow builds the app with Tauri and uses
[dmgbuild](https://github.com/dmgbuild/dmgbuild) to set the Finder layout without an interactive
Finder session. The resulting disk image has the app, an Applications link, and the install
instructions on its background. Local Tauri images can also have a hidden `.VolumeIcon.icns`
file for the mounted disk's icon.
The [disk image artwork](src-tauri/dmg/artwork.html) uses the website stylesheet. Render it at
640×340 for the standard image and at 640×410 with `?preview` for the preview image.

After dragging the app into Applications, open **Open Preview** from the mounted preview disk
image if macOS blocks first launch. The helper verifies the installed app's signature and checks
that it matches the build on the disk image. It then clears the download quarantine attribute from
that app bundle and opens it. Use this helper with a preview you downloaded from this repository.
If Finder blocks the helper itself, open Terminal, type `/bin/bash ` with a trailing space, drag
**Open Preview** into the Terminal window, then press Return.

Tauri signs the bundled Node executable alongside the Mac app. The native build check launches
that signed executable with the backend and web assets from inside the application bundle.

For a notarized Mac release, export a Developer ID Application certificate with its private key
as a password-protected `.p12`. Set `APPLE_CERTIFICATE` to the base64-encoded export and
`APPLE_CERTIFICATE_PASSWORD` to its password in GitHub Actions secrets. Add `APPLE_ID`,
`APPLE_PASSWORD` (an app-specific password), and `APPLE_TEAM_ID` for Apple notarization. The
release build verifies the app signature and stapled notarization, then submits and staples the
downloadable disk image before computing its checksum and packaging the draft.
These credentials are separate from the updater key.
[Tauri macOS signing guide](https://v2.tauri.app/distribute/sign/macos/)

## Verified package build

[Run 43836649167](https://github.com/Quaii/oh-my-gui/actions/runs/43836649167) passed Windows x64,
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

## Native workflow parity

Project folder selection uses `tauri-plugin-dialog` through the authenticated backend/native pipe.
Installer completion clears installer-only environment flags and stale native-session values before
starting the installed app. The native host also removes inherited installer flags before starting
any normal backend; otherwise Browse and tray actions are incorrectly gated off as installer routes.
The chooser is parented to the main window, returns cancellation as a null selection and does not
register/create anything until the project form is submitted. Browser hosts have a server-owned,
read-only directory navigator; React never accesses the filesystem directly.

Windows/macOS tray clicks open a separate, undecorated React webview using the same authenticated
loopback backend and appearance storage. No workspace, setup flow or model bridge mounts there.
The popup is positioned in physical coordinates inside the clicked monitor's work area, resized for
small screens, hidden on focus loss/Escape, and excluded from the taskbar. Chat actions are resolved
against authoritative recent/running rows before native forwarding. Closing the main window after
confirmation exits the app even while the hidden tray webview exists. Linux retains the native menu
because Tauri's Linux indicator backend does not deliver tray click events.

### Application updates

Settings → Updates & changelog and About report the app version independently of the OMP version.
Bundled release notes live in `shared/app-release.json`; update this alongside all three package,
Cargo and Tauri version fields for each release. The GUI uses the authenticated local API for update
status and commands. The native host alone uses Tauri's official updater; no updater IPC permissions
or arbitrary download URLs are exposed to the webview.

Update-enabled builds embed `OMP_UPDATE_PUBLIC_KEY` and `OMP_UPDATE_ENDPOINT` at compile time. The
endpoint and download must use HTTPS without embedded credentials. Missing configuration disables
checks visibly. The default development build makes no release requests. Configured builds check
at most daily automatically, with manual checks available. “Remind me tomorrow” persists a version-
specific 24-hour deadline in app data (`updates.json`). GitHub errors remain errors, not “up to date.”

The official updater downloads and verifies the signature before the ready state. The user then
confirms Install and restart. Unsaved/saving editor documents, pending API mutations, starting bridges,
running agents and native operations block installation. New mutation requests are blocked during the
handoff. On Windows, the owned backend is stopped before the signed NSIS upgrade replaces files;
the installer relaunches the app. The quiet updater handoff uses the installation engine, not the
custom first-install extraction wrapper. User chats, appearance, providers and setup data remain in
their existing directories outside the replaced application files. macOS/AppImage use the plugin's
platform updater; deb installations should be upgraded through the package manager.

The updater is not a claim of transactional rollback across power loss. Fresh install, N→N+1 upgrade,
failed download/signature, locked-file, interrupted-upgrade, uninstall and data-retention checks on real
target machines remain release acceptance. No real upgrade is run merely to inspect the interface.

### Preparing a signed GitHub release

1. The owner generates and backs up an updater signing key using the [Tauri signing guide](https://v2.tauri.app/plugin/updater/).
   Store its private value in GitHub secret `TAURI_SIGNING_PRIVATE_KEY`, its password in
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, and its public value in repository variable `OMP_UPDATE_PUBLIC_KEY`.
   Never commit the private key or bundle a GitHub account token. Updater signing is separate from OS signing.
2. Update version fields and bundled changelog, commit, and create the matching `vX.Y.Z` tag.
3. Run **Prepare signed desktop release** manually with that existing tag. The workflow builds and
   signs updater packages for Windows x64, macOS arm64/x64 and Linux x64, includes the separate
   branded first-install packages and checksums, generates a combined
   `latest.json`, and creates a **draft** GitHub release for owner review. It does not publish or change
   repository visibility. `OMP_SIGNED_RELEASE=true` enables updater artifact generation in local builds
   only when both signing configuration and an HTTPS feed are present.
4. Verify an actual upgrade in a disposable profile/machine before publishing the draft. Feed/package
   downloads must be accessible to clients: this private repository's release endpoint cannot serve
   unauthenticated public installs. Before a public release, use a public release repository or a
   dedicated HTTPS feed and compile its endpoint into the initial distributed build.

`scripts/desktop-update-manifest.mjs` names signed assets by platform/architecture, rejects mixed
versions and duplicate targets, and refuses incomplete platform sets when combining a release.
CI execution and a live signed N→N+1 upgrade are not established by local unit/build checks.

The custom Windows installer reports explicit progress through preflight, package checksum, OMP
runtime, native dependency checks, app/runtime copy, installed-file verification and setup handoff.
The OMP step checks the stable release for the current platform and installs a missing or newer
runtime into desktop app data. It checks the release checksum and executable version before replacing
the managed copy. Newer runtimes and explicit `OMP_BIN` overrides are kept. An update can make the
app use its managed copy while the existing standalone binary remains available.
The NSIS pre/post
install hooks append boundaries to a temporary stage log supplied only to the owned installation
process. The GUI polls its local status; no clock-driven percentage is used. The overall bar measures
completed stages and the checksum percentage measures actual read bytes. Copy/dependency stages
remain active until reported by the native engine. Verification checks the app, bundled Node, server,
UI, uninstaller and per-user Windows uninstall registration before enabling Open setup.

`node scripts/check-installer-progress.mjs` compiles and runs the actual hooks in an inert NSIS executable
that writes temporary stage markers only. It installs no app, shortcuts, runtime or registry entries.
Checksum regressions and inert compact UI fixtures are separate from fresh-install/upgrade acceptance.

The main application owns an accent-synchronized system tray menu: Open, Settings, five recent chats,
running sessions and Quit. Recent chat metadata refreshes with a short cache; unchanged menu state is
not rebuilt. Live chat navigation retains its bridge key. All native CloseRequested events go through
the shared quit dialog; Keep in tray hides the window, while confirmed quit stops the owned backend.
Installers retain their existing installation-aware close confirmation and do not create tray icons.
The tray-data regressions and browser dialog fixtures are separate from native OS interaction tests.
Skills loading/failure/recovery and the running-session quit dialog passed inert browser checks;
tray data and live-bridge identity have regression coverage. Native tray-menu clicks and taskbar-close
interaction still require interactive acceptance on the intended OS.

The desktop and browser hosts share the protocol-v2 decoder, startup dialog replay and paged transcript
loader. The primary GUI bridge uses `rpc-ui`; native OMP disables interactive PTYs in this mode.
Interactive shells, terminal-only extension renderers and credential-bearing CLI workflows therefore
retain an explicit native-terminal handoff through Settings → Native operations. The GUI never silently
starts a native operation when a management page loads.

Native jobs track process exit and cancellation. Their summaries omit log bodies; open job views request
incremental output, with a bounded retained tail. Native/API endpoints require a matching loopback origin
in browser mode, in addition to the desktop session cookie where applicable. Secrets are not routed
through generic credential/token command output.

The [coverage map](CAPABILITIES.md) and [parity ledger](OMP-PARITY-TASKS.md) distinguish source-reachable
workflows from acceptance. `node scripts/check-rpc-parity.mjs` uses a temporary keyless profile, synthetic
history and a trusted test extension; `node scripts/check-native-operations.mjs` reads all installed help
and runs only isolated stats. Neither invokes a model, changes an account, installs a package or starts a
real service. Provider audio/voice, native-terminal launch and mutating workflows still need acceptance on
the intended host. Build output or a successful health request is not a native window interaction test.

`node scripts/check-api-origin.mjs` exercises the actual Vite proxy against an inert local API. The
development proxy preserves the browser Host header for origin validation; production binds only to
loopback. The fixture verifies accepted same-origin traffic and rejected remote/null origins without OMP.
