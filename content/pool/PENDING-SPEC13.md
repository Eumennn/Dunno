# SPEC 13 lafları: tasarımcı onayı bekliyor

Uygulamaya özel derin havuzlar (dil başına 20) ve yeni uygulamalar (steam, blender, ide, study). id'ler `tr_` / `en_` önekli, aynı numara;
`intent` alanında `spec 13 ... (awaiting designer approval)` işareti var. `rare: true` olanlar nadir (seçilen grupta %10).
Onaylanan laf intent'ten işareti silerek, reddedilen laf silinerek ya da değiştirilerek kapanır. `npm run pool:check` her derin trigger'da
dil başına en az 2 nadir laf ister.

| trigger | id aralığı (dil öneki hariç) | nadir |
|---|---|---|
| `app:excel` | excel_11 .. excel_20 | excel_19, excel_20 |
| `app:browser` | browser_11 .. browser_20 | browser_19, browser_20 |
| `app:discord` | discord_11 .. discord_20 | discord_19, discord_20 |
| `app:spotify` | spotify_11 .. spotify_20 | spotify_19, spotify_20 |
| `app:vscode` | vscode_11 .. vscode_20 | vscode_19, vscode_20 |
| `app:figma` | figma_11 .. figma_20 | figma_19, figma_20 |
| `app:terminal` | terminal_11 .. terminal_20 | terminal_19, terminal_20 |
| `app:word` | word_11 .. word_20 | word_19, word_20 |
| `app:powerpoint` | powerpoint_11 .. powerpoint_20 | powerpoint_19, powerpoint_20 |
| `app:photoshop` | photoshop_11 .. photoshop_20 | photoshop_19, photoshop_20 |
| `site:video` | site_video_13 .. site_video_20 | site_video_19, site_video_20 |
| `site:code` | site_code_13 .. site_code_20 | site_code_19, site_code_20 |
| `app:steam` | steam_01 .. steam_20 | steam_19, steam_20 |
| `app:blender` | blender_01 .. blender_20 | blender_19, blender_20 |
| `app:ide` | ide_01 .. ide_20 | ide_19, ide_20 |
| `app:study` | study_01 .. study_20 | study_19, study_20 |
