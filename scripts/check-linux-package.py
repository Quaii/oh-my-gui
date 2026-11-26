#!/usr/bin/env python3
"""Verify a Linux .deb and exercise the packaged GTK/WebKit app without a real OMP account."""

import argparse
import http.client
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
import time

PORT = 4319
TITLE = "Oh My GUI"


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def run(*args, check=True, timeout=15):
    return subprocess.run(
        args, check=check, timeout=timeout, text=True, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ).stdout.strip()


def deb_field(deb, field):
    return run("dpkg-deb", "--field", deb, field)


def one(paths, name):
    paths = list(paths)
    require(len(paths) == 1, f"Expected one {name}, found {len(paths)}")
    return paths[0]


def check_package(deb, root):
    architecture = deb_field(deb, "Architecture")
    node_arch = {"amd64": "x64", "arm64": "arm64"}.get(architecture)
    require(architecture == run("dpkg", "--print-architecture") and node_arch, f"Wrong test architecture: {architecture}")
    version = deb_field(deb, "Version")
    require(bool(version), "Missing Debian package version")
    depends = deb_field(deb, "Depends")
    require(re.search(r"\blibwebkit2gtk-4\.1-0\b", depends), f"Missing WebKitGTK dependency: {depends}")
    run("dpkg-deb", "--extract", deb, root, timeout=90)
    launcher = one((root / "usr/share/applications").glob("*.desktop"), "desktop launcher")
    run("desktop-file-validate", launcher)
    fields = dict(line.partition("=")[::2] for line in launcher.read_text().splitlines() if "=" in line)
    require(fields.get("Name") == TITLE and fields.get("Type") == "Application", "Incorrect desktop metadata")
    executable = fields.get("Exec", "")
    require(re.fullmatch(r"[A-Za-z0-9._-]+", executable), f"Unexpected launcher Exec: {executable!r}")
    icon = fields.get("Icon", "")
    require(icon and any((root / "usr/share/icons").glob(f"**/{icon}.png")), f"Missing installed launcher icon: {icon!r}")
    native = root / "usr/bin" / executable
    bundled_node = one((root / "usr/lib").glob("*/runtime/node"), "bundled Node binary")
    runtime = bundled_node.parent
    require((runtime / "server/src/index.mjs").is_file(), "Missing bundled backend")
    require((runtime / "web/dist/index.html").is_file(), "Missing bundled frontend")
    require(any((runtime / "licenses").glob("node-*.txt")), "Missing bundled Node license")
    for binary in (native, bundled_node):
        require(binary.is_file() and os.access(binary, os.X_OK), f"Not an executable file: {binary}")
    print(f"Verified .deb layout, runtime and launcher ({version}, {architecture})", flush=True)
    return executable, bundled_node.relative_to(root), node_arch, launcher.relative_to(root)


def listen_rows():
    return run("ss", "-H", "-ltnp", f"sport = :{PORT}")


def anonymous_status(method, target):
    connection = http.client.HTTPConnection("127.0.0.1", PORT, timeout=2)
    try:
        connection.request(method, target)
        return connection.getresponse().status
    finally:
        connection.close()


def stop_tree(proc):
    # Only our process group, never another instance of the app or backend.
    try:
        os.killpg(proc.pid, signal.SIGTERM)
        proc.wait(timeout=4)
    except ProcessLookupError:
        pass
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)
        proc.wait(timeout=4)


def wait_until(check, seconds, description, app=None):
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        if app is not None:
            require(app.poll() is None, f"App exited before {description}, status {app.returncode}")
        result = check()
        if result:
            return result
        time.sleep(0.2)
    raise RuntimeError(f"Timed out waiting for {description}")


def isolated_environment(work):
    home = work / "home"
    for directory in ("", ".config", ".local/share", ".cache", ".local/state"):
        (home / directory).mkdir(parents=True, exist_ok=True, mode=0o700)
    runtime_dir = work / "xdg-runtime"
    runtime_dir.mkdir(exist_ok=True, mode=0o700)
    preserved = ("DISPLAY", "XAUTHORITY", "DBUS_SESSION_BUS_ADDRESS",
                 "LD_LIBRARY_PATH", "GI_TYPELIB_PATH", "GIO_EXTRA_MODULES", "GST_PLUGIN_SYSTEM_PATH_1_0")
    environment = {key: os.environ[key] for key in preserved if key in os.environ}
    environment.update(
        PATH="/usr/bin:/bin", HOME=str(home), LANG="C.UTF-8", GDK_BACKEND="x11",
        XDG_CONFIG_HOME=str(home / ".config"), XDG_DATA_HOME=str(home / ".local/share"),
        XDG_CACHE_HOME=str(home / ".cache"), XDG_STATE_HOME=str(home / ".local/state"),
        XDG_RUNTIME_DIR=str(runtime_dir), OMP_BIN=str(home / "unavailable-smoke-test-runtime"),
    )
    return environment


def exercise(native, bundled_node, work, iteration):
    require(not listen_rows(), f"Port {PORT} is already in use; use a disposable Linux runner")
    environment = isolated_environment(work)
    log = work / f"app-{iteration}.log"
    with log.open("wb") as output:
        app = subprocess.Popen([native], cwd=environment["HOME"], env=environment, start_new_session=True,
                               stdout=output, stderr=subprocess.STDOUT)
        try:
            def visible_window():
                windows = run("xdotool", "search", "--onlyvisible", "--name", f"^{TITLE}$", check=False)
                return next((window for window in windows.splitlines()
                             if run("xdotool", "getwindowpid", window, check=False) == str(app.pid)), None)

            # Native starts hidden. The expected window is only revealed after the packaged
            # WebKit UI executes JS and posts its authenticated readiness signal to Node.
            window = wait_until(visible_window, 35, "a visible Oh My GUI window", app)
            geometry = run("xdotool", "getwindowgeometry", window)
            size = re.search(r"Geometry: (\d+)x(\d+)", geometry)
            require(size and int(size[1]) >= 640 and int(size[2]) >= 440, f"Unexpected window size: {geometry}")

            sockets = listen_rows().splitlines()
            require(len(sockets) == 1 and sockets[0].split()[3] == f"127.0.0.1:{PORT}",
                    f"Expected exactly one loopback listener: {sockets}")
            owner = re.search(r"pid=(\d+)", sockets[0])
            require(owner, "Could not identify the backend socket owner")
            backend = int(owner[1])
            require(os.path.samefile(f"/proc/{backend}/exe", bundled_node),
                    "Desktop did not run the packaged Node executable")
            status = Path(f"/proc/{backend}/status").read_text()
            require(re.search(rf"^PPid:\s*{app.pid}$", status, re.MULTILINE), "Backend is not owned by the desktop app")
            require(anonymous_status("GET", "/api/health") == 403, "Anonymous health request was not refused")
            require(anonymous_status("POST", "/api/desktop/window") == 403, "Anonymous window action was not refused")

            # Send a normal window-manager close, not XDestroyWindow or a process signal.
            run("xdotool", "windowactivate", "--sync", window, "key", "alt+F4")
            require(app.wait(timeout=15) == 0, "Desktop did not exit cleanly via WM close")
            wait_until(lambda: not Path(f"/proc/{backend}").exists() and not listen_rows(),
                       8, "backend process and socket cleanup")
            print(f"Launch {iteration}: native WebKit UI, bundled loopback backend, access checks and GUI shutdown passed",
                  flush=True)
        except Exception:
            print(log.read_text(errors="replace"), file=sys.stderr)
            raise
        finally:
            stop_tree(app)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("deb", type=Path)
    parser.add_argument("--installed", action="store_true", help="Use APT-installed files, verifying version and bytes against the .deb")
    parser.add_argument("--metadata-only", action="store_true", help="Validate the package and bundled backend without starting a desktop")
    parser.add_argument("--use-display", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    deb = args.deb.resolve(strict=True)
    if not args.use_display and not args.metadata_only:
        with tempfile.TemporaryDirectory(prefix="omg-linux-session-") as session:
            environment = dict(os.environ, HOME=session, XDG_RUNTIME_DIR=session)
            return subprocess.call([
                "xvfb-run", "-a", "-s", "-screen 0 1600x1000x24", "dbus-run-session", "--",
                sys.executable, str(Path(__file__).resolve()), "--use-display",
                *(["--installed"] if args.installed else []), str(deb),
            ], env=environment)

    with tempfile.TemporaryDirectory(prefix="omg-linux-smoke-") as directory:
        work = Path(directory)
        extracted = work / "package"
        executable, node_path, node_arch, launcher = check_package(deb, extracted)
        prefix = Path("/") if args.installed else extracted
        native = prefix / "usr/bin" / executable
        bundled_node = prefix / node_path
        if args.installed:
            actual = run("dpkg-query", "-W", "-f=${Status} ${Version}", deb_field(deb, "Package"))
            require(actual == f"install ok installed {deb_field(deb, 'Version')}", f"Wrong installed package: {actual}")
            runtime = node_path.parent
            for relative in (native.relative_to(prefix), node_path, launcher,
                             runtime / "server/src/index.mjs", runtime / "web/dist/index.html"):
                require(subprocess.run(["cmp", "--silent", extracted / relative, prefix / relative]).returncode == 0,
                        f"Installed package differs: {relative}")
        version = run(bundled_node, "-p", "process.platform + ':' + process.arch + ':' + process.versions.node")
        flavor, arch, semver = version.split(":")
        require(flavor == "linux" and arch == node_arch and int(semver.split(".")[0]) >= 24,
                f"Unexpected bundled Node runtime: {version}")
        print(f"Bundled Node starts: {version}", flush=True)
        backend_check = Path(__file__).with_name("check-desktop.mjs").resolve()
        subprocess.run([bundled_node, backend_check, bundled_node.parent, bundled_node],
                       check=True, timeout=45, env=isolated_environment(work / "backend-check"))
        if args.metadata_only:
            return 0
        with (work / "window-manager.log").open("wb") as output, subprocess.Popen(
            ["openbox", "--sm-disable"], stdout=output, stderr=subprocess.STDOUT
        ) as window_manager:
            try:
                wait_until(lambda: "_NET_SUPPORTING_WM_CHECK(WINDOW)" in
                           run("xprop", "-root", "_NET_SUPPORTING_WM_CHECK", check=False),
                           10, "Openbox becoming ready", window_manager)
                for iteration in (1, 2):
                    exercise(native, bundled_node, work, iteration)
            finally:
                window_manager.terminate()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except subprocess.CalledProcessError as error:
        sys.exit(f"Linux package smoke check failed ({error}):\n{error.stderr or error.stdout or ''}")
    except (RuntimeError, OSError, subprocess.TimeoutExpired) as error:
        sys.exit(f"Linux package smoke check failed: {error}")
