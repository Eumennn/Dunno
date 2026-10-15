mod app_window;
mod media;
mod commands;
mod context;
mod license;
mod meeting;
mod mods;
mod monitors;
mod tray;
mod updates;
mod watch;
mod window;

use tauri::{Manager, WindowEvent};

pub fn run() {
    tauri::Builder::default()
        // tek kopya: ikinci açılış (Başlat menüsü) yeni pet başlatmaz, mevcut dunno.exe'yi öne getirir.
        // Odak sadece kullanıcı açtığında: autostart argümanıyla gelen ikinci açılış hiçbir şey yapmaz.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if !window::launched_by_autostart(args) {
                let _ = window::open_app_window(app);
            }
        }))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::Builder::new().arg(window::AUTOSTART_ARG).build())
        // imzalı güncelleme (SPEC 10 CL1): kontrol/kurulum sadece updates.rs komutlarıyla, webview'e eklenti API'si açılmaz
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(window::PetWindow::default())
        .invoke_handler(tauri::generate_handler![
            commands::set_hit_rects,
            commands::set_pet_mask,
            commands::set_capture,
            commands::get_work_area,
            commands::move_window,
            commands::set_interactive,
            commands::set_pet_visible,
            commands::set_window_box,
            commands::get_debug_flags,
            commands::get_move_count,
            commands::open_app_window,
            commands::window_drag,
            commands::window_minimize,
            commands::window_hide,
            commands::window_toggle_maximize,
            commands::window_toggle_fullscreen,
            commands::set_app_zoom,
            commands::get_autostart,
            commands::set_autostart,
            watch::set_manual_meeting,
            watch::set_tab_titles,
            watch::accessibility_status,
            watch::get_watch_state,
            tray::update_tray_state,
            updates::update_check,
            commands::list_mods,
            commands::mods_dir,
            commands::open_mods_dir,
            commands::restart_app,
            commands::save_card,
            commands::install_pack,
            commands::remove_pack,
            commands::license_token,
            commands::save_gif,
            media::set_music_watch,
            commands::license_status,
            commands::license_activate,
            commands::license_remove,
            updates::update_install,
        ])
        .on_window_event(|win, event| {
            if win.label() != window::APP_LABEL {
                return;
            }
            let Some(app_win) = win.app_handle().get_webview_window(window::APP_LABEL) else { return };
            match event {
                // dunno.exe kapatılınca uygulama kapanmaz, pencere gizlenir (pet çalışmaya devam eder); yer kaydedilir
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    app_window::save(&app_win, true);
                    let _ = win.hide();
                }
                // boyut ve konum hatırlanır (SPEC 07 FB3)
                WindowEvent::Moved(_) | WindowEvent::Resized(_) => app_window::save(&app_win, false),
                _ => {}
            }
        })
        .setup(|app| {
            let win = app
                .get_webview_window(window::MAIN_LABEL)
                .expect("main window missing from tauri.conf.json");
            // SPEC 19 macOS: Dock'ta simge yok (sadece menü çubuğu), pet tüm masaüstlerinde (Spaces) görünür
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                let _ = win.set_visible_on_all_workspaces(true);
            }
            window::place_initial(app.handle(), &win)?;
            win.show()?;
            window::spawn_cursor_watch(app.handle().clone());
            watch::spawn(app.handle().clone());
            media::spawn(app.handle().clone());
            tray::setup(app.handle())?;
            // Başlat menüsünden açılınca dunno.exe de açılır; Windows ile başlatılınca sadece pet
            if !window::launched_by_autostart(std::env::args()) {
                window::open_app_window(app.handle())?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running dunno");
}
