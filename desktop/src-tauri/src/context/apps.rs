//! exe adı -> uygulama etiketi. Eşleme cihazda yapılır; exe adı dışarı gitmez, saklanmaz.
//! Etiket TS tarafında `app:<etiket>` trigger'ı olur (zoom/teams/webex lafsızdır, toplantı korumasına gider).

/// (exe adı küçük harf, ".exe" olmadan) -> etiket
const APPS: &[(&str, &str)] = &[
    ("excel", "excel"),
    ("winword", "word"),
    ("code", "vscode"),
    ("cursor", "vscode"),
    ("figma", "figma"),
    ("spotify", "spotify"),
    ("chrome", "browser"),
    ("msedge", "browser"),
    ("firefox", "browser"),
    ("brave", "browser"),
    ("opera", "browser"),
    ("zoom", "zoom"),
    ("ms-teams", "teams"),
    ("teams", "teams"),
    ("slack", "slack"),
    ("windowsterminal", "terminal"),
    ("wt", "terminal"),
    ("powershell", "terminal"),
    ("pwsh", "terminal"),
    ("cmd", "terminal"),
    ("webex", "webex"),
    ("ciscocollabhost", "webex"),
    ("webexmta", "webex"),
    ("atmgr", "webex"),
    // SPEC 03 P1 genişlemesi (desktop/src/lines/pool-check.ts APP_TAGS ile aynı etiketler)
    ("powerpnt", "powerpoint"),
    ("photoshop", "photoshop"),
    ("discord", "discord"),
    ("outlook", "mail"),
    ("olk", "mail"),
    ("hxoutlook", "mail"),
    ("thunderbird", "mail"),
    ("notion", "notion"),
    // explorer.exe masaüstü/görev çubuğu da olduğundan masaüstüne tıklayınca da file_explorer sayılır
    ("explorer", "file_explorer"),
    ("systemsettings", "settings"),
    // SPEC 13: uygulamaya özel tepkiler için yeni etiketler
    ("steam", "steam"),
    ("steamwebhelper", "steam"),
    ("blender", "blender"),
    // IDE'ler (VS Code ayrı: vscode)
    ("devenv", "ide"),
    ("idea64", "ide"),
    ("pycharm64", "ide"),
    ("webstorm64", "ide"),
    ("rider64", "ide"),
    ("clion64", "ide"),
    ("goland64", "ide"),
    ("phpstorm64", "ide"),
    ("studio64", "ide"),
    ("eclipse", "ide"),
    ("sublime_text", "ide"),
    ("notepad++", "ide"),
    // ders / not / okuma
    ("anki", "study"),
    ("obsidian", "study"),
    ("onenote", "study"),
    ("zotero", "study"),
    ("acrobat", "study"),
    ("acrord32", "study"),
    ("sumatrapdf", "study"),
    // oyun başlatıcıları (oyunun kendi exe'si bilinmez; başlatıcı öndeyse oyun modu)
    ("epicgameslauncher", "game"),
    ("battle.net", "game"),
    ("riotclientux", "game"),
    ("leagueclientux", "game"),
    ("robloxplayerbeta", "game"),
    ("minecraftlauncher", "game"),
];

/// macOS (SPEC 19 M3): uygulama paket kimliği -> tablodaki exe adı (Windows ile aynı etiketler/laflar).
/// Tabloda yoksa çağıran uygulamanın çalıştırılabilir adını dener (ör. "Code", "Spotify").
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub const MAC_BUNDLES: &[(&str, &str)] = &[
    ("com.microsoft.excel", "excel"),
    ("com.microsoft.word", "winword"),
    ("com.microsoft.powerpoint", "powerpnt"),
    ("com.microsoft.vscode", "code"),
    ("com.todesktop.230313mzl4w4u92", "cursor"),
    ("com.figma.desktop", "figma"),
    ("com.google.chrome", "chrome"),
    ("org.mozilla.firefox", "firefox"),
    ("com.microsoft.edgemac", "msedge"),
    ("com.brave.browser", "brave"),
    ("com.operasoftware.opera", "opera"),
    ("com.apple.safari", "chrome"),
    ("company.thebrowser.browser", "chrome"),
    ("com.apple.terminal", "windowsterminal"),
    ("com.googlecode.iterm2", "windowsterminal"),
    ("dev.warp.warp-stable", "windowsterminal"),
    ("com.spotify.client", "spotify"),
    ("com.tinyspeck.slackmacgap", "slack"),
    ("com.hnc.discord", "discord"),
    ("com.valvesoftware.steam", "steam"),
    ("notion.id", "notion"),
    ("us.zoom.xos", "zoom"),
    ("com.microsoft.teams", "teams"),
    ("com.microsoft.teams2", "teams"),
    ("com.cisco.webexmeetingsapp", "webex"),
    ("com.adobe.photoshop", "photoshop"),
    ("org.blenderfoundation.blender", "blender"),
    ("com.riotgames.leagueoflegends", "leagueclientux"),
    ("com.mojang.minecraftlauncher", "minecraftlauncher"),
    ("com.roblox.roblox", "robloxplayerbeta"),
];

/// paket kimliği (büyük/küçük harf duyarsız) -> exe adı
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub fn exe_for_bundle(bundle_id: &str) -> Option<&'static str> {
    let b = bundle_id.trim().to_ascii_lowercase();
    MAC_BUNDLES.iter().find(|(id, _)| *id == b).map(|(_, exe)| *exe)
}

/// Yol ya da "Name.EXE" olabilir; dosya adını küçük harfe çevirip ".exe"yi atar.
pub fn exe_stem(path_or_name: &str) -> String {
    let file = path_or_name
        .rsplit(['\\', '/'])
        .next()
        .unwrap_or(path_or_name);
    let lower = file.trim().to_ascii_lowercase();
    lower.strip_suffix(".exe").unwrap_or(&lower).to_string()
}

/// exe -> etiket; tabloda yoksa None.
pub fn app_for_exe(path_or_name: &str) -> Option<&'static str> {
    let stem = exe_stem(path_or_name);
    APPS.iter()
        .find(|(exe, _)| *exe == stem)
        .map(|(_, app)| *app)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mac_bundles_map_to_known_apps() {
        assert_eq!(exe_for_bundle("com.microsoft.Excel").and_then(app_for_exe), Some("excel"));
        assert_eq!(exe_for_bundle("com.apple.Safari").and_then(app_for_exe), Some("browser"));
        assert_eq!(exe_for_bundle("com.microsoft.VSCode").and_then(app_for_exe), Some("vscode"));
        assert_eq!(exe_for_bundle("com.example.unknown"), None);
        // tablodaki her exe gerçekten etiketli (zoom/teams/webex toplantı tarafında)
        for (_, exe) in MAC_BUNDLES {
            assert!(app_for_exe(exe).is_some() || crate::meeting::MEETING_APPS.contains(exe), "{exe}");
        }
    }

    #[test]
    fn maps_the_table() {
        let cases = [
            ("EXCEL.EXE", Some("excel")),
            ("WINWORD.EXE", Some("word")),
            ("Code.exe", Some("vscode")),
            ("Cursor.exe", Some("vscode")),
            ("Figma.exe", Some("figma")),
            ("Spotify.exe", Some("spotify")),
            ("chrome.exe", Some("browser")),
            ("msedge.exe", Some("browser")),
            ("firefox.exe", Some("browser")),
            ("brave.exe", Some("browser")),
            ("opera.exe", Some("browser")),
            ("Zoom.exe", Some("zoom")),
            ("ms-teams.exe", Some("teams")),
            ("Teams.exe", Some("teams")),
            ("slack.exe", Some("slack")),
            ("WindowsTerminal.exe", Some("terminal")),
            ("wt.exe", Some("terminal")),
            ("powershell.exe", Some("terminal")),
            ("pwsh.exe", Some("terminal")),
            ("cmd.exe", Some("terminal")),
            ("CiscoCollabHost.exe", Some("webex")),
            ("webexmta.exe", Some("webex")),
            ("atmgr.exe", Some("webex")),
            ("POWERPNT.EXE", Some("powerpoint")),
            ("Photoshop.exe", Some("photoshop")),
            ("Discord.exe", Some("discord")),
            ("OUTLOOK.EXE", Some("mail")),
            ("olk.exe", Some("mail")),
            ("HxOutlook.exe", Some("mail")),
            ("thunderbird.exe", Some("mail")),
            ("Notion.exe", Some("notion")),
            ("explorer.exe", Some("file_explorer")),
            ("SystemSettings.exe", Some("settings")),
            ("steam.exe", Some("steam")),
            ("steamwebhelper.exe", Some("steam")),
            ("blender.exe", Some("blender")),
            ("devenv.exe", Some("ide")),
            ("idea64.exe", Some("ide")),
            ("pycharm64.exe", Some("ide")),
            ("studio64.exe", Some("ide")),
            ("sublime_text.exe", Some("ide")),
            ("notepad++.exe", Some("ide")),
            ("anki.exe", Some("study")),
            ("Obsidian.exe", Some("study")),
            ("ONENOTE.EXE", Some("study")),
            ("Acrobat.exe", Some("study")),
            ("AcroRd32.exe", Some("study")),
            ("EpicGamesLauncher.exe", Some("game")),
            ("Battle.net.exe", Some("game")),
            ("RiotClientUx.exe", Some("game")),
            ("RobloxPlayerBeta.exe", Some("game")),
        ];
        for (exe, want) in cases {
            assert_eq!(app_for_exe(exe), want, "{exe}");
        }
    }

    #[test]
    fn unknown_is_none() {
        for exe in ["notepad.exe", "", "excelsior.exe", "chrome_proxy.exe"] {
            assert_eq!(app_for_exe(exe), None, "{exe}");
        }
    }

    #[test]
    fn strips_paths_and_case() {
        assert_eq!(
            exe_stem(r"C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE"),
            "excel"
        );
        assert_eq!(exe_stem("/usr/bin/zoom"), "zoom");
        assert_eq!(
            app_for_exe(r"C:\Users\x\AppData\Local\Programs\Microsoft VS Code\Code.exe"),
            Some("vscode")
        );
    }
}
