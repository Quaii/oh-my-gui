<p align="center"><img src="site/assets/brand.svg" alt="" width="54" height="54"></p>

<h1 align="center">omp.</h1>

<p align="center"><a href="https://github.com/can1357/oh-my-pi">Oh My Pi</a>, with a UI.</p>

<p align="center"><a href="#get-started">Get started</a> · <a href="#showcase">Screenshots</a> · <a href="DESKTOP.md">Desktop builds</a> · <a href="https://github.com/Quaii/omp-frontend/releases">Releases</a></p>

The CLI you already use, in a desktop and browser workspace for your chats, projects, and files. omp. connects to your local Oh My Pi installation.

## Showcase

<!-- Replace these captures with new app screenshots using fictional project data. Keep the shared asset paths so the website updates as well. -->

[![Workspace overview in Carbon, showing unfinished tasks, projects, and recent chats](site/assets/workspace-overview.webp)](site/assets/workspace-overview.webp)

### A workspace you can make your own

[![Seven app slices in Carbon, Ash, Steel, Forest, Midnight, Plum, and Paper with different backgrounds](site/assets/theme-study.webp)](site/assets/theme-study.webp)

These seven examples are a starting point. You can change individual interface colors, use your own background image, and adjust fonts, icons, scale, corner radius, and glass effects. The images below open at full size.

| Project chat | Appearance |
| --- | --- |
| [![Project conversation reviewing CSV import cases](site/assets/project-chat.webp)](site/assets/project-chat.webp) | [![Appearance settings showing the theme and background controls](site/assets/appearance.webp)](site/assets/appearance.webp) |
| **Steel / Tide** | **Paper / Silver** |
| [![Workspace overview with the Steel theme and Tide background](site/assets/workspace-steel.webp)](site/assets/workspace-steel.webp) | [![Workspace overview with the Paper theme and Silver background](site/assets/workspace-paper.webp)](site/assets/workspace-paper.webp) |

## What you can do

| Area | In omp. |
| --- | --- |
| Workspace | Resume running or unfinished work from Home. Pin chats, group them by project, and start a new project chat from a folder. |
| Conversations | Watch the agent work, expand tool activity, queue and steer follow-ups, and revisit earlier turns. |
| Files | Inspect changed files and open source beside the chat. Save with conflict detection for externally changed files. |
| Runtime | Manage providers, models and role overrides, skills, MCP servers, prompts, personas, and extensions. |
| Usage and appearance | See local token and cost estimates, check supported subscription quotas, and customize your theme and background. |

## Get started

### Desktop

Check [GitHub Releases](https://github.com/Quaii/omp-frontend/releases) for available downloads. The Windows build uses a custom installer and first-launch setup that can offer to install or update OMP. macOS and Linux package builds and platform verification requirements are in the [desktop guide](DESKTOP.md).

### Browser or source development

Install Node.js 24 or newer and the [Oh My Pi runtime](https://github.com/can1357/oh-my-pi#install), then run:

```sh
git clone --branch tauri https://github.com/Quaii/omp-frontend.git
cd omp-frontend
npm ci
npm run dev
```

Open [localhost:5317](http://localhost:5317). The API runs on port 4317. For a production browser build, run `npm run build` and `npm start`, then open [localhost:4317](http://localhost:4317).

`OMP_BIN` selects a specific OMP executable. `PI_CODING_AGENT_DIR` selects the OMP agent directory, which defaults to `~/.omp/agent`. `OMP_API_TARGET` points Vite to a separate local API. `PORT` and `HOST` configure the server’s loopback address.

## How it fits together

The React interface runs in a browser or the Tauri desktop shell. A local Node server bridges HTTP and server-sent events to OMP’s JSONL RPC. The app uses the local OMP installation for sessions, configuration, and native agent actions. Model requests still go through the providers you configure. See the [GUI coverage audit](CAPABILITIES.md) for native, host-managed, and terminal-only capabilities and their verification status.

## Development

| Area | Start here |
| --- | --- |
| Interface | [web/src](web/src) and [design guide](DESIGN.md) |
| Local API and runtime bridge | [server/src](server/src) and [shared helpers](shared) |
| Desktop shell and packaging | [src-tauri](src-tauri) and [desktop guide](DESKTOP.md) |
| Contributing | [Project instructions](AGENTS.md), [agent skills](.agents/skills/README.md), and [asset credits](ASSET-CREDITS.md) |

```sh
npm run typecheck
npm test
npm run build
npm run docs:check
```

The live chat and routing checks in [scripts](scripts) use a configured model and make disposable test requests. See [GUI coverage](CAPABILITIES.md) for the isolated audit commands.

## Project website

The [static landing page](site/index.html) uses the shared showcase assets in `site/assets/`. Open it locally or serve the `site/` directory with a static HTTP server. The page has no build step and needs no runtime credentials.

The [Pages workflow](.github/workflows/site-pages.yml) is manual. Once it is on the default branch and GitHub Pages is configured to use GitHub Actions, an owner can run **Publish project website** from the Actions tab. Review the site’s visibility before running it. The workflow deploys only `site/`. [GitHub Pages configuration guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
