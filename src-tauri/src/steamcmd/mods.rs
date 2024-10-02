use futures::future;
use std::fs;
use std::io;
use std::sync::Arc;
use tokio::process;
use tokio::sync::Semaphore;

use crate::models;
use crate::steamcmd;
use crate::utils;

#[tauri::command]
pub async fn install_mods(file_path: String) -> Result<(), String> {
    let steamcmd_dir = steamcmd::install().await?;

    let file = fs::File::open(&file_path).map_err(|e| e.to_string())?;
    let reader = io::BufReader::new(file);
    let mods: Vec<models::Mod> = serde_json::from_reader(reader).map_err(|e| e.to_string())?;

    let steamcmd = if utils::is_os("windows") {
        format!("{}/steamcmd.exe", steamcmd_dir)
    } else {
        format!("{}/steamcmd.sh", steamcmd_dir)
    };

    let semaphore = Arc::new(Semaphore::new(2));

    let tasks: Vec<_> = mods
        .into_iter()
        .map(|mod_info| {
            let steamcmd = steamcmd.clone();
            let semaphore = semaphore.clone();

            tokio::spawn(async move {
                let permit = semaphore.acquire_owned().await.unwrap();

                println!(
                    "Starting to install mod: {} with ID: {}",
                    mod_info.name, mod_info.id
                );

                let output = process::Command::new(&steamcmd)
                    .arg("+login anonymous")
                    .arg(format!("+workshop_download_item 294100 {}", mod_info.id))
                    .arg("+quit")
                    .output()
                    .await
                    .expect("Failed to execute SteamCMD");

                drop(permit);

                if output.status.success() {
                    println!(
                        "Successfully downloaded mod: {} with ID: {}",
                        mod_info.name, mod_info.id
                    );
                    Ok::<(), String>(())
                } else {
                    let error_message = format!(
                        "Failed to download mod: {} with ID: {}. SteamCMD output: {}",
                        mod_info.name,
                        mod_info.id,
                        String::from_utf8_lossy(&output.stderr)
                    );
                    println!("{}", error_message);
                    Err(error_message)
                }
            })
        })
        .collect();

    let results = future::join_all(tasks).await;

    for result in results {
        if let Err(e) = result {
            return Err(format!("Mod installation failed: {}", e));
        }
    }

    Ok(())
}
