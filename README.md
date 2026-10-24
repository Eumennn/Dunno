# dunno

> the desktop companion that teaches you absolutely nothing

a tiny pixelated bean that lives in the corner of your screen, judges your 40 open browser tabs, and answers almost no questions correctly. speaks the truth exactly three times a day, then immediately regrets having a brain.

[English](README.md) • [Türkçe](README.tr.md) • [Español](README.es.md)

site: [eumennn.github.io/Dunno](https://eumennn.github.io/Dunno/)

---

## download

- **windows 10 / 11 (64-bit):** [Dunno-setup.exe](https://github.com/Eumennn/Dunno/releases/download/v0.2.35/Dunno-setup.exe)  
  no admin rights needed. installs in your user folder and chills.
- **macOS (apple silicon & intel, macOS 11+):** [Dunno.dmg](https://github.com/Eumennn/Dunno/releases/download/v0.2.35/Dunno.dmg)
  open dmg, drag to applications, done.
- **all releases:** [GitHub Releases](https://github.com/eumennn/dunno/releases)

---

## why is windows screaming at you? (smartscreen & certificates)

when you open the app, windows will probably panic and say *"Windows protected your PC - unrecognized app"*.

here's the deal: microsoft and apple demand $500 to $600 every single year for a code signing certificate so that popup goes away. we are two people building this for fun, neither of us has 500 bucks to spare on a digital signature for a lazy blue bean. the bean is broke, we are broke.

because we didn't pay the corporate extortion fee, windows automatically assumes any indie executable is a threat until thousands of people run it. no russian botnet here, just broke developers.

### how to run it:
- **windows:**
  1. click **"More info"**.
  2. click **"Run anyway"**.
- **macOS:**
  1. right-click dunno in applications and click **"Open"**.
  2. if it still complains, go to **System Settings > Privacy & Security**, scroll down and click **"Open Anyway"**.

### is it actually safe?
yes, 100%.
- every build is compiled publicly on github's automated runners (CI/CD).
- zero malware. honestly the bean barely has the energy to do its own job, let alone mine crypto on your gpu.
- no spyware: doesn't record your screen, doesn't log your keystrokes, doesn't listen to your mic. it doesn't even care enough about you to spy on you.

---

## updates

once a day dunno checks github in the background. if there's an update it'll grumble about having to download new lines. it never forces an update on you (**about.txt > install**).

verified with cryptographic keys (minisign), unverified files are rejected.

---

## privacy

- no screen scraping or OCR. it only glances at window titles to roast you when you have youtube open instead of working.
- no keylogger, no mic recording.
- your questions are never sold to advertisers or AI companies.

read [PRIVACY.md](PRIVACY.md) if you want the legal text.

---

## uninstall

if you get tired of its attitude:
- **windows:** settings > apps > installed apps > dunno > uninstall.
- **macOS:** drag dunno from applications to trash.

---

## contact & bugs

- **found a bug or got an idea:** [GitHub Issues](https://github.com/eumennn/dunno/issues)
- **email:** `dunnothebean@gmail.com`

*(we do not guarantee dunno will be useful. in fact, dunno guarantees the exact opposite)*