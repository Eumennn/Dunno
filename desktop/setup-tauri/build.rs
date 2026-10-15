// Gömülecek kurulum: DUNNO_SETUP_PAYLOAD (Tauri NSIS çıktısı, CI release.yml verir). Yoksa boş: geliştirme derlemesi,
// arayüz "içi boş" der ve hiçbir şey kurmaz.
use std::{env, fs, path::PathBuf};

fn main() {
    println!("cargo:rerun-if-env-changed=DUNNO_SETUP_PAYLOAD");
    println!("cargo:rerun-if-env-changed=DUNNO_VERSION");
    let out = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR")).join("payload.exe");
    match env::var_os("DUNNO_SETUP_PAYLOAD") {
        Some(p) => {
            println!("cargo:rerun-if-changed={}", PathBuf::from(&p).display());
            fs::copy(&p, &out).expect("DUNNO_SETUP_PAYLOAD okunamadı");
        }
        None => fs::write(&out, []).expect("payload yazılamadı"),
    }
    tauri_build::build()
}
