# Desktop development

The Tauri 2 shell reuses the production React build and the existing Node API. It starts a private
backend at `127.0.0.1:4319`, then opens the native window only after that process reports readiness.
The ordinary browser app remains available with `npm run dev` / `npm start`.

## Commands

- `npm run desktop:dev` — prepare shared assets and run the native debug shell.
- `npm run desktop:build` — prepare resources, build a release executable and Windows NSIS installer.
- `npm run desktop:prepare` — build the UI and bundle the backend/resources without compiling Rust.
- `npm run desktop:check` — test the prepared backend on an ephemeral loopback port. Checks private
  bootstrap, health, UI assets and shutdown; makes no model requests or file writes.
- `npm run desktop:release-check` — check matching release versions and write installer SHA256SUMS.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check` — check the Rust shell formatting.

Windows development requires Node 24+, Rust/MSVC, Visual Studio C++ build tools and WebView2.
`Cargo.lock` and `package-lock.json` pin dependencies. The current packager copies the build machine's
Node runtime; build on the target OS/architecture. The Node license for that exact version and YAML's
license are included in the generated resources. The existing frontend public license assets are
copied with the web build. Resources, Rust targets and generated schemas are ignored by Git.

## Runtime boundary

The shell launches the bundled Node executable and ESM backend, rather than requiring a system Node
installation. It preserves the backend resource layout for RPC metadata and the persona extension.
OMP itself is **not bundled**: install OMP normally, or configure `OMP_BIN` in the launching environment.
Git/GitHub-dependent functions still require Git and an existing login, just as in the web version.
No credentials or private chats are packaged.

Desktop navigation commits immediately. The frequent sidebar resize uses a short CSS width transition
instead of taking full blurred-canvas View Transition snapshots. The browser retains its transition-kit
behavior. The native title-bar icon follows validated appearance accents through an authenticated backend
event; this does not rewrite the installed shortcut/executable icon.

The server stays on loopback. A per-launch secret authenticates a window bootstrap via an
HttpOnly, SameSite=Strict cookie; requests without the desktop session or from another origin are
rejected. The bootstrap redirects to `/` and suppresses referrer forwarding. The page has no Tauri
IPC capabilities. Native navigation remains in this origin; HTTP/HTTPS external links open with the
system browser, and other navigation schemes are refused. Stable port and app identity preserve
WebView storage between runs; desktop preferences are separate from existing browser-profile storage.
Only one desktop instance can own port 4319; a second launch fails rather than attaching to an
unverified process. This initial version does not yet focus an existing window on a second launch.

The shell owns backend stdin. Closing it requests graceful OMP/backend shutdown, with a bounded wait
and owned-process-tree termination fallback on Windows. If the parent is terminated, EOF on the pipe
also asks the backend to stop. It never stops the user's separate web development server.

## Current limits and release work

See [TAURI-TASKS.md](TAURI-TASKS.md) for verified milestones. A successful build or backend check does
not establish native rendering, live chat streaming or editor behavior. Those need interactive checks
in the WebView. Do not call the installer publicly release-ready until those checks are recorded.

This is a Windows-first, unsigned development build. Installer signing, automatic updates, an OMP
onboarding/bundling policy, crash/restart UX, native close handling for unsaved documents, and macOS/Linux
packaging remain release work. There is no custom titlebar or redesigned desktop UI in this milestone.

Official references: [Tauri resources](https://v2.tauri.app/develop/resources/),
[external binaries](https://v2.tauri.app/develop/sidecar/), and
[WebviewWindowBuilder](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html).

## First development artifact

The unsigned Windows x64 installer is generated at
`src-tauri/target/release/bundle/nsis/omp_0.1.0_x64-setup.exe`. An isolated install/uninstall and
installed-runtime smoke check passed. The installer is NotSigned; do not describe it as trusted,
SmartScreen-approved or publicly release-ready. Nothing is published automatically.

For the next release, update package.json, src-tauri/tauri.conf.json and src-tauri/Cargo.toml together,
run the web/native checks, build, and run desktop:release-check. Keep build artifacts out of Git.
Windows signing requires the owner's certificate/signing service; automatic updates additionally need
a protected updater signing key and an approved distribution endpoint. Do not generate placeholder
credentials or publish an unsigned update feed. Other platforms require their own native verification.
