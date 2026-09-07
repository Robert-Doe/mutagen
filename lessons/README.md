# lessons/ — cross-module concept clusters

A cluster lives here (not inside a module) when it spans several modules and
belongs to none of them.

## 01_history-of-mxss/

| File | What |
|---|---|
| `01_explainer.html` | The timeline: 2013 (Heiderich, CCS) → the amendment decade → 2023+ (Sanitizer API). Same tutorial style, topic-scoped. |
| `02_deepdive_heiderich_era.html` | Why "sanitize the string" is *unsound*, not buggy; which 2013-era payloads are dead and why (four of five families closed by serializer hardening). |
| `03_deepdive_dompurify_bypass_chain.html` | The DOMPurify bypasses generation by generation, each with its root-cause hinge and the permanent fix; the four-move pattern all the fixes share; where to find primary sources. |

**Relates to:** Modules 3, 4, 5, 6, 7 (each attack family appears on the timeline);
Module 8 (the four fix-moves are the hardened sanitizer's four ideas); Module 10
(`classifyHinge`'s five families = the timeline's five families); Module 11 (the
structural end of the timeline).

**Why central, not in a module:** each attack module needs only its own slice of
the history. The timeline as a whole — and the "the space is closed and small
after a decade" conclusion — only makes sense once Modules 3–8 exist. Read it
after Module 5.

## Clusters that live in the sibling courses (linked, not duplicated)

- `../../bob_foster_parenting/lessons/01_insertion_mode_statechart/` — the
  insertion-mode state machine (relates to Module 1, 5, 7).
- `../../bob_foster_parenting/lessons/02_scope_and_active_formatting/` — includes
  a security-implications deep dive (relates to Module 5).
- `../../bob_CSP_trusted_types/lessons/02_csp_trusted_types_layering/` — how CSP
  and Trusted Types layer above sanitising (relates to Module 8, 11).
