use crate::utils;
use std::env;
use std::path::Path;
use tokio::process::Command;
use which::which;

#[tauri::command]
pub fn is_installed() -> Result<String, String> {
    let steamcmd_path = if utils::is_os("windows") {
        "C:/RimRust/steamcmd/steamcmd.exe".to_string()
    } else {
        format!("{}/RimRust/steamcmd/steamcmd.sh", env::var("HOME").unwrap())
    };

    if Path::new(&steamcmd_path).exists() {
        return Ok(steamcmd_path);
    }

    if let Ok(steamcmd_in_path) = which("steamcmd") {
        return Ok(steamcmd_in_path.to_string_lossy().to_string());
    }

    Err("steamcmd is not installed".to_string())
}

#[tauri::command]
pub async fn install() -> Result<String, String> {
    let steamcmd_dir = if cfg!(target_os = "windows") {
        "C:/RimRust/steamcmd".to_string()
    } else {
        format!("{}/RimRust/steamcmd", std::env::var("HOME").unwrap())
    };

    if !Path::new(&format!("{}/steamcmd.sh", steamcmd_dir)).exists()
        && !Path::new(&format!("{}/steamcmd.exe", steamcmd_dir)).exists()
    {
        std::fs::create_dir_all(&steamcmd_dir).map_err(|e| e.to_string())?;

        if cfg!(target_os = "windows") {
            let output = Command::new("powershell")
                .arg("-Command")
                .arg(format!(
                    "Invoke-WebRequest -Uri https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip -OutFile steamcmd.zip; Expand-Archive steamcmd.zip -DestinationPath {}; Remove-Item steamcmd.zip",
                    steamcmd_dir
                ))
                .output()
                .await
                .expect("Failed to download SteamCMD");

            if !output.status.success() {
                return Err("Failed to install SteamCMD on Windows.".to_string());
            }
        } else {
            let output = Command::new("sh")
                .arg("-c")
                .arg(format!(
                    "curl -O https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz && mkdir -p {} && tar -xvzf steamcmd_osx.tar.gz -C {} && rm steamcmd_osx.tar.gz",
                    steamcmd_dir, steamcmd_dir
                ))
                .output()
                .await
                .expect("Failed to download SteamCMD");

            if !output.status.success() {
                return Err("Failed to install SteamCMD on Linux/macOS.".to_string());
            }
        }
    }

    utils::add_to_path(&steamcmd_dir);
    Ok(steamcmd_dir)
}
