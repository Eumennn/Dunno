// FB6 kurulum önizlemesi (Linux, Windows gerekmez): Tauri'nin şablona verdiği veriyi taklit eder, installer.nsi'yi doldurur.
// Gerekenler: makensis (apt nsis), wine + wine32, Xvfb, xdotool, imagemagick; bir kez: npm i --no-save handlebars@4.7.8
// Kullanım: node render.mjs <build-dizini>   (build dizininde tauri-bundler'ın utils.nsh, FileAssociation.nsh, languages/,
//           plugins/x86-unicode/nsis_tauri_utils.dll ve sahte dunno.exe olmalı; ayrıntı docs/RELEASE.md)
import Handlebars from "handlebars";
import { readFileSync, writeFileSync } from "node:fs";
const B = process.argv[2] ?? "build";
const D = new URL("../../src-tauri", import.meta.url).pathname;
const tpl = `${D}/installer/installer.nsi`;
const out = `${B}/installer.nsi`;
const hb = Handlebars.create();
const esc = (s) => String(s).replace(/["$`\n\t\r]/g, (c) => ({ '"': '$\\"', $: "$$", "`": "$\\`", "\n": "$\\n", "\t": "$\\t", "\r": "$\\r" })[c]);
hb.registerHelper("or", (a, b) => a || b);
hb.registerHelper("no-escape", (x) => new Handlebars.SafeString(x));
hb.registerHelper("association-description", (d, e) => d || e);
const t = hb.compile(readFileSync(tpl, "utf8"), { noEscape: false });
const data = {
  compression: "lzma", manufacturer: "Dunno", product_name: "Dunno", version: "0.1.0", version_with_build: "0.1.0.0", homepage: "", install_mode: "currentUser",
  license: "", installer_icon: `${D}/icons/icon.ico`, sidebar_image: `${D}/installer/sidebar.bmp`, header_image: `${D}/installer/header.bmp`, uninstaller_icon: "", uninstaller_header_image: "",
  main_binary_name: "dunno", main_binary_path: `${B}/dunno.exe`, bundle_id: "app.dunno.desktop", copyright: "© 2026 Dunno", out_file: `${B}/setup.exe`, arch: "x64",
  additional_plugins_path: `${B}/plugins/x86-unicode`, allow_downgrades: true, display_language_selector: false, install_webview2_mode: process.env.WV || "downloadBootstrapper",
  webview2_installer_args: "/silent", webview2_bootstrapper_path: "", webview2_installer_path: "", minimum_webview2_version: "", uninstaller_sign_cmd: "",
  estimated_size: "0x00002000", start_menu_folder: "Dunno", languages: [process.env.LANGS || "Turkish", "English"].filter((v, i, a) => a.indexOf(v) === i),
  language_files: [`${B}/languages/${process.env.LANGS || "Turkish"}.nsh`, `${B}/languages/English.nsh`].filter((v, i, a) => a.indexOf(v) === i),
  binaries: {}, resources: {}, resources_dirs: [], resources_ancestors: [], file_associations: [], deep_link_protocols: [], installer_hooks: "", signed_plugins_path: "",
};
Handlebars.Utils.escapeExpression = esc;
writeFileSync(out, t(data));
