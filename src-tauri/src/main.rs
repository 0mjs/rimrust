mod models;
mod steamcmd;
mod utils;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            steamcmd::mods::install_mods,
            steamcmd::install::install,
            steamcmd::install::is_installed
        ])
        .run(tauri::generate_context!())
        .expect("Failed to run RimRust.");
}
