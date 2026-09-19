import './style.css';

// Real engine code, reused (not reimplemented) — see webapp/src/engine/*.mjs
// provenance headers for exact source paths.
// @ts-ignore - plain .mjs, no type declarations
import { parseFragment, hasLiveHandler } from './engine/lab.mjs';
// @ts-ignore
import { naiveSanitize, correctSanitize, VECTORS } from './engine/namespace-vectors.mjs';

type Vector = { name: string; payload: string; flaw: string };
const vectors: Vector[] = VECTORS;

const exampleSelect = document.getElementById('example-select') as HTMLSelectElement;
const sanitizerSelect = document.getElementById('sanitizer-select') as HTMLSelectElement;
const input = document.getElementById('input') as HTMLTextAreaElement;
const btnSanitize = document.getElementById('btn-sanitize') as HTMLButtonElement;
const cleanedOutput = document.getElementById('cleaned-output') as HTMLElement;
const staticVerdict = document.getElementById('static-verdict') as HTMLElement;
const btnReparse = document.getElementById('btn-reparse') as HTMLButtonElement;
const sandboxHolder = document.getElementById('sandbox-holder') as HTMLElement;
const liveVerdict = document.getElementById('live-verdict') as HTMLElement;
const logPanel = document.getElementById('log-panel') as HTMLElement;

// ── populate the example dropdown from the real, verified vector catalogue ──
vectors.forEach((v, i) => {
  const opt = document.createElement('option');
  opt.value = String(i);
  opt.textContent = `${v.name} — ${v.flaw}`;
  exampleSelect.appendChild(opt);
});
// "mtext/mglyph/style" is the default: its naive-sanitizer output keeps a
// real `<img src=x onerror=alert(1)>` (not `href=`), so the sandboxed
// re-parse step below causes an ACTUAL failed image load and an ACTUAL
// onerror call in the real browser engine — not just the toy engine's
// static prediction. ("image alias" is also a genuine, verified bypass of
// the naive sanitizer, but its `<image href=...>` only matches HTML's
// `<img src=...>` load attribute after the tag-name correction, not the
// attribute name, so it won't itself trigger a network fetch here — it's
// still offered in the dropdown for the tag-aliasing lesson.)
const DEFAULT_VECTOR_INDEX = vectors.findIndex((v) => v.name === 'mtext/mglyph/style');
exampleSelect.value = String(DEFAULT_VECTOR_INDEX >= 0 ? DEFAULT_VECTOR_INDEX : 0);
input.value = vectors[Number(exampleSelect.value)].payload;

exampleSelect.addEventListener('change', () => {
  input.value = vectors[Number(exampleSelect.value)].payload;
  resetOutputs();
});

function resetOutputs() {
  cleanedOutput.textContent = '—';
  setVerdict(staticVerdict, 'idle', 'Run the sanitizer to see its verdict.');
  setVerdict(liveVerdict, 'idle', 'Sanitize first, then re-parse.');
  logPanel.textContent = '—';
  btnReparse.disabled = true;
  sandboxHolder.innerHTML = '';
}

function setVerdict(el: HTMLElement, state: 'idle' | 'safe' | 'danger', text: string) {
  el.className = `verdict verdict-${state}`;
  el.textContent = text;
}

let lastCleaned = '';

btnSanitize.addEventListener('click', () => {
  const html = input.value;
  const mode = sanitizerSelect.value;
  let cleaned: string;
  try {
    cleaned = mode === 'naive' ? naiveSanitize(html) : correctSanitize(html);
  } catch (e) {
    cleaned = `[sanitizer threw: ${(e as Error).message}]`;
  }
  lastCleaned = cleaned;
  cleanedOutput.textContent = cleaned || '(empty — everything was stripped)';

  // static prediction, using the same real engine's parser + probe the attack
  // modules use (hasLiveHandler), on the browser's would-be reparse.
  let predictedLive = false;
  try {
    const reparsedTree = parseFragment(cleaned, 'body', { scripting: true });
    predictedLive = hasLiveHandler(reparsedTree);
  } catch {
    predictedLive = false;
  }
  if (predictedLive) {
    setVerdict(
      staticVerdict,
      'danger',
      'Engine prediction: the cleaned output still contains a live event handler once reparsed.'
    );
  } else {
    setVerdict(
      staticVerdict,
      'safe',
      'Engine prediction: no live handler survives in the cleaned output.'
    );
  }

  setVerdict(liveVerdict, 'idle', 'Ready — click "Re-parse in sandbox" to prove it in a real browser.');
  logPanel.textContent = '—';
  sandboxHolder.innerHTML = '';
  btnReparse.disabled = false;
});

// ── the sandboxed re-parse ──────────────────────────────────────────────
// The cleaned string is handed to a REAL browser parser, isolated in an
// <iframe sandbox="allow-scripts"> (no allow-same-origin) via srcdoc. If the
// payload's handler is still live, its own script call (e.g. the literal
// `alert(1)` the payload tries to run) is what proves it — we only intercept
// window.alert/onerror inside that sandboxed frame so a hosted demo can't pop
// a real dialog, and relay the fact that it fired back via postMessage.
function buildSrcdoc(cleanedHtml: string): string {
  const escapedForComment = cleanedHtml.replace(/-->/g, '--&gt;');
  return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body>
<script>
(function () {
  var reported = [];
  // "dangerous" kinds are proof that INJECTED SCRIPT actually ran (the
  // payload's own alert(1) call, or a thrown JS exception). A plain resource
  // load failure (e.g. an <img> whose src 404s) is NOT proof of anything —
  // every broken image fires one, sanitized or not — so it is logged for
  // transparency but never counted as a live mutation on its own.
  function report(kind, detail, dangerous) {
    reported.push({ kind: kind, detail: String(detail), dangerous: !!dangerous });
    try { parent.postMessage({ __mutagen: true, kind: kind, detail: String(detail), dangerous: !!dangerous }, '*'); } catch (e) {}
  }
  window.alert = function (msg) { report('alert', 'alert(' + msg + ') executed from the reparsed markup', true); };
  window.addEventListener('error', function (e) {
    // capture-phase 'error' fires for both resource errors (img/script load
    // failure, e.target is the element) and uncaught script exceptions
    // (e.target is window). Only the latter is evidence of executed code.
    if (e && e.target === window) {
      report('script-exception', e.message || 'an uncaught script exception occurred', true);
    } else {
      report('resource-error', 'a resource (e.g. the img src) failed to load — expected, not a mutation', false);
    }
  }, true);
  window.onerror = function (msg) { report('script-exception', msg, true); return true; };
  setTimeout(function () {
    try { parent.postMessage({ __mutagen: true, kind: 'done', count: reported.length }, '*'); } catch (e) {}
  }, 700);
})();
<\/script>
<!-- sanitizer output, re-parsed verbatim by this document's own HTML parser: -->
<!-- ${escapedForComment} -->
${cleanedHtml}
</body></html>`;
}

let reparseNonce = 0;

btnReparse.addEventListener('click', () => {
  const nonce = ++reparseNonce;
  sandboxHolder.innerHTML = '';
  logPanel.textContent = '';
  setVerdict(liveVerdict, 'idle', 'Reparsing inside the sandbox…');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.setAttribute('srcdoc', buildSrcdoc(lastCleaned));
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.border = '0';
  sandboxHolder.appendChild(iframe);

  const events: string[] = [];
  let fired = false;
  let settled = false;

  function finish() {
    if (settled) return;
    settled = true;
    window.removeEventListener('message', onMessage);
    logPanel.textContent = events.length ? events.join('\n') : '(no events reported — nothing executed)';
    if (fired) {
      setVerdict(liveVerdict, 'danger', 'MUTATION FIRED — the sanitized output executed on reparse.');
    } else {
      setVerdict(liveVerdict, 'safe', 'BLOCKED — nothing executed on reparse.');
    }
  }

  function onMessage(ev: MessageEvent) {
    if (nonce !== reparseNonce) return; // stale iframe from a previous click
    const data = ev.data;
    if (!data || typeof data !== 'object' || !('__mutagen' in data)) return;
    if (data.kind === 'done') {
      finish();
      return;
    }
    if (data.dangerous) fired = true;
    events.push(`[${data.kind}]${data.dangerous ? ' *** ' : ' '}${data.detail}`);
    logPanel.textContent = events.join('\n');
  }

  window.addEventListener('message', onMessage);
  // safety net in case the iframe's own timeout message is lost
  setTimeout(finish, 1500);
});

resetOutputs();
