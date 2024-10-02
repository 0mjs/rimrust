use serde::Deserialize;

#[derive(Deserialize)]
pub struct Mod {
    pub name: String,
    pub id: String,
}
