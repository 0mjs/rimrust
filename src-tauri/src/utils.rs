use std::env;

pub fn is_os(os: &str) -> bool {
    match os {
        "windows" => cfg!(target_os = "windows"),
        "linux" => cfg!(target_os = "linux"),
        "macos" => cfg!(target_os = "macos"),
        _ => false,
    }
}

pub fn add_to_path(new_path: &str) {
    let path = env::var_os("PATH").unwrap_or_default();
    let mut paths = env::split_paths(&path).collect::<Vec<_>>();
    paths.push(new_path.into());
    let new_path = env::join_paths(paths).unwrap();
    env::set_var("PATH", &new_path);
}
