use std::{
    ffi::OsString,
    io,
    os::windows::ffi::{OsStrExt, OsStringExt},
    path::{Path, PathBuf},
    ptr::null,
};
use windows_sys::Win32::{
    Foundation::{CloseHandle, ERROR_MORE_DATA},
    System::{
        RestartManager::{
            RmEndSession, RmForceShutdown, RmGetList, RmRegisterResources, RmShutdown,
            RmStartSession, CCH_RM_SESSION_KEY, RM_PROCESS_INFO, RM_UNIQUE_PROCESS,
        },
        Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION},
    },
};

fn checked(code: u32) -> io::Result<()> {
    if code == 0 {
        Ok(())
    } else {
        Err(io::Error::from_raw_os_error(code as i32))
    }
}

struct RestartSession(u32);

impl RestartSession {
    fn start() -> io::Result<Self> {
        let mut handle = 0;
        let mut key = [0; CCH_RM_SESSION_KEY as usize + 1];
        checked(unsafe { RmStartSession(&mut handle, 0, key.as_mut_ptr()) })?;
        Ok(Self(handle))
    }

    fn processes(&self) -> io::Result<Vec<RM_PROCESS_INFO>> {
        let mut processes: Vec<RM_PROCESS_INFO> = Vec::new();
        for _ in 0..4 {
            let mut needed = 0;
            let mut count = processes.len() as u32;
            let mut reason = 0;
            let buffer = if processes.is_empty() {
                std::ptr::null_mut()
            } else {
                processes.as_mut_ptr()
            };
            let result = unsafe { RmGetList(self.0, &mut needed, &mut count, buffer, &mut reason) };
            if result == ERROR_MORE_DATA {
                processes.resize(needed as usize, RM_PROCESS_INFO::default());
            } else {
                checked(result)?;
                processes.truncate(count as usize);
                return Ok(processes);
            }
        }
        Err(io::Error::other(
            "The running application list kept changing.",
        ))
    }
}

impl Drop for RestartSession {
    fn drop(&mut self) {
        unsafe { RmEndSession(self.0) };
    }
}

fn process_image(pid: u32) -> Option<PathBuf> {
    let process = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if process.is_null() {
        return None;
    }
    let mut image = vec![0; 32_768];
    let mut length = image.len() as u32;
    let result = unsafe { QueryFullProcessImageNameW(process, 0, image.as_mut_ptr(), &mut length) };
    unsafe { CloseHandle(process) };
    if result == 0 {
        return None;
    }
    dunce::canonicalize(PathBuf::from(OsString::from_wide(
        &image[..length as usize],
    )))
    .ok()
}

fn installed_processes(executable: &Path) -> io::Result<Vec<RM_UNIQUE_PROCESS>> {
    let session = RestartSession::start()?;
    let file: Vec<u16> = executable
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect();
    checked(unsafe { RmRegisterResources(session.0, 1, &file.as_ptr(), 0, null(), 0, null()) })?;
    Ok(session
        .processes()?
        .into_iter()
        .filter_map(|entry| {
            let image = process_image(entry.Process.dwProcessId)?;
            image
                .to_string_lossy()
                .eq_ignore_ascii_case(&executable.to_string_lossy())
                .then_some(entry.Process)
        })
        .collect())
}

pub fn run(close: bool) -> io::Result<&'static str> {
    let local_data = std::env::var_os("LOCALAPPDATA")
        .ok_or_else(|| io::Error::other("Local application data is unavailable."))?;
    let programs = PathBuf::from(local_data).join("Programs");
    if !programs.is_absolute() {
        return Err(io::Error::other(
            "Local application data must be an absolute path.",
        ));
    }
    let preferred = programs.join("Oh My GUI");
    let legacy = programs.join("omp");
    for target in [
        preferred.join("OhMyGUI.exe"),
        legacy.join("OhMyGUI.exe"),
        legacy.join("omp-desktop.exe"),
    ] {
        if !stop_installed_app(&target, close)? {
            return Ok("running");
        }
    }

    // Wait for either bundled backend to release its executable.
    for directory in [preferred, legacy] {
        match dunce::canonicalize(directory.join("runtime").join("node.exe")) {
            Ok(path) if !installed_processes(&path)?.is_empty() => return Ok("draining"),
            Ok(_) => (),
            Err(error) if error.kind() == io::ErrorKind::NotFound => (),
            Err(error) => return Err(error),
        }
    }
    Ok("closed")
}

fn stop_installed_app(target: &Path, close: bool) -> io::Result<bool> {
    let executable = match dunce::canonicalize(target) {
        Ok(path) => path,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(true),
        Err(error) => return Err(error),
    };
    let processes = installed_processes(&executable)?;
    if !processes.is_empty() {
        if !close {
            return Ok(false);
        }

        // Register only processes verified against the installed desktop executable.
        let session = RestartSession::start()?;
        checked(unsafe {
            RmRegisterResources(
                session.0,
                0,
                null(),
                processes.len() as u32,
                processes.as_ptr(),
                0,
                null(),
            )
        })?;
        let result = unsafe { RmShutdown(session.0, RmForceShutdown as u32, None) };
        if !installed_processes(&executable)?.is_empty() {
            checked(result)?;
            return Ok(false);
        }
    }
    Ok(true)
}
