// ui-kit demo: tüm bileşenler tek sayfada (görsel doğrulama için). Metinler landing'deki örneklerdir.
import "./fonts.css";
import "./tokens.css";
import "./kit.css";
import "./demo.css";
import {
  dunnoHtml,
  heartsHtml,
  segmentedHtml,
  thinkingHtml,
  toastHtml,
  winHtml,
  youHtml,
} from "./kit";

const mode = { value: "polite" };

const askBody = () => `
  <div class="demo-askhead">
    ${segmentedHtml("mood", [{ value: "polite", label: "polite" }, { value: "street", label: "street ***" }], mode.value)}
    ${heartsHtml(2, 3, "2 of 3 questions left today")}
  </div>
  <div class="demo-log" aria-live="polite">
    ${youHtml("what is the capital of france")}
    ${dunnoHtml("somewhere with croissants. probably.")}
    ${youHtml("ok but really")}
    ${thinkingHtml()}
  </div>
  <form class="demo-form" onsubmit="return false">
    <input class="field" type="text" placeholder="ask away (i won't answer)" autocomplete="off" />
    <button class="pbtn pbtn-blue pbtn-sm" type="submit">ask</button>
  </form>`;

const outBody = `
  <form class="demo-form" onsubmit="return false">
    <span class="demo-out">office hours are over. forever.</span>
    <button class="pbtn pbtn-sm" type="button">beg</button>
  </form>`;

function render(): void {
  document.querySelector("#demo")!.innerHTML = `
  <section class="demo-col">
    <p><span class="kick">ui-kit</span> <span class="hl">same world as the landing</span></p>
    ${winHtml("ask.exe", askBody())}
    ${winHtml("ask.exe", outBody)}
  </section>
  <section class="demo-col">
    <div class="demo-row">
      <button class="pbtn">download</button>
      <button class="pbtn pbtn-dark">dunno</button>
      <button class="pbtn pbtn-blue">ask</button>
    </div>
    <div class="demo-row">
      <button class="pbtn pbtn-sm">[ yes ]</button>
      <button class="pbtn pbtn-sm pbtn-dark">[ dunno ]</button>
      <button class="pbtn pbtn-sm" disabled>pro</button>
    </div>
    ${winHtml("error.exe", `<p class="demo-pad">office hours are over. forever.</p>`, { bar: "err" })}
    ${winHtml("nap.exe", `<p class="demo-pad">zzz</p>`, { bar: "blue" })}
    ${winHtml("idle.exe", `<p class="demo-pad">waiting for nothing.</p>`, { bar: "idle" })}
    <div class="demo-bubwrap"><div class="bub">i know nothing. on purpose.</div></div>
    <div class="demo-toastwrap">${toastHtml("dunno took a coffee break")}</div>
    <p class="px">silkscreen label 0123</p>
  </section>`;
  document.querySelectorAll<HTMLButtonElement>(".seg").forEach((b) =>
    b.addEventListener("click", () => {
      mode.value = b.dataset.value!;
      render();
    }),
  );
}

render();
