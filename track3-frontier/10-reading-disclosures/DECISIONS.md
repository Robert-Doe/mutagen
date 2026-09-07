# DECISIONS — Module 10: Reading Disclosures

**(a)** spec-forced · **(b)** contract-forced · **(c)** our convention.

## `dissect()` is four functions of the payload, in a fixed order

**(c)** Q1 = `parseFragment(payload, ctx, {scripting:false})`,
Q2 = `serialize(Q1)`, Q3 = `parseFragment(Q2, sink, {scripting:true})`,
Q4 = `classifyHinge` iff `!hasLiveHandler(Q1) && hasLiveHandler(Q3)`. Fixed order
so every disclosure gets the same treatment and the notes are comparable.

## Default `sanitizerContext` is `template`, `sinkContext` is `div`

**(c)** The most common real pairing: a client-side sanitizer using
`<template>`/`DOMParser` (scripting off), an app sink of `el.innerHTML`
(scripting on, arbitrary element — `div` as the neutral stand-in). Both are
arguments so a reader can model a server-side sanitizer (`DOMParser` context) or
a table sink.

## `classifyHinge` is five regexes, one per mechanism family

**(c)** After Modules 3–7 there are exactly five families (raw-text, namespace,
scripting flag, attribute, template). A new disclosure is almost always a new
*instance* of one. The classifier is deliberately a lookup, not an inference
engine — its job is to say "this is the namespace family, go read Module 5", not
to be clever.

## The module reports historical payloads as PATCHED where our engine says so

**(c)** `dissect()` models the 2026 serializer, so CVE-2020-26870 and the
`<noscript>` payload come back `mutates: false`. Rather than hack the engine to
"reproduce" a 2019 result, the tutorial's brain exercise makes the
version-pinning point explicit: a payload's fires/doesn't-fire verdict has a
date; its Q4 hinge does not.

## The disclosure list carries `ref` tags into REFERENCES.md

**(b)** Each entry cites `[R9]`–`[R12]` so a reader can find the original
write-up and its patch commit.

## What We Proved

- `dissect()` produces Q1–Q4 for any payload; the hinge is a non-trivial string.
- The `<noscript>` and CVE-2020-26870 shapes are reported as **patched**
  (`mutates: false`) by our 2026-modelling engine.
- The method separates "mutates" (safe→dangerous across the round trip) from
  "plain DOM XSS" (dangerous both sides) from "benign".
- Every entry in `DISCLOSURES` is dissectable and gets a named hinge.
- 5/5 assertions pass.
