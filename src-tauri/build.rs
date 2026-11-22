fn main() {
    println!("cargo:rerun-if-env-changed=OMP_UPDATE_PUBLIC_KEY");
    println!("cargo:rerun-if-env-changed=OMP_UPDATE_ENDPOINT");
    tauri_build::build()
}
