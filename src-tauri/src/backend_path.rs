use std::path::{Path, PathBuf};

/// Tauri canonicalizes Windows resource paths to `\\?\C:\...`. Node's entry
/// resolver rejects that form, so simplify only paths with an equivalent Win32 form.
/// Keep native filesystem scoping/canonicalization unchanged on the server.
pub fn for_child(path: &Path) -> PathBuf {
    dunce::simplified(path).to_path_buf()
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    use std::process::Command;

    #[test]
    fn bundled_node_resolves_a_canonical_resource_entry() {
        let runtime = Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/runtime");
        let entry = std::fs::canonicalize(runtime.join("server/src/index.mjs"))
            .expect("run desktop:prepare before the native regression tests");
        assert!(entry.to_string_lossy().starts_with(r"\\?\"));
        let output = Command::new(runtime.join("node.exe"))
            .args(["-e", "require('node:fs').realpathSync(process.argv[1])"])
            .arg(for_child(&entry))
            .output()
            .expect("bundled Node starts");
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    #[test]
    fn ordinary_paths_and_reserved_paths_keep_their_meaning() {
        assert_eq!(
            for_child(Path::new(r"C:\Users\name\file.mjs")),
            PathBuf::from(r"C:\Users\name\file.mjs")
        );
        assert_eq!(
            for_child(Path::new(r"\\?\C:\COM1")),
            PathBuf::from(r"\\?\C:\COM1")
        );
    }
}
