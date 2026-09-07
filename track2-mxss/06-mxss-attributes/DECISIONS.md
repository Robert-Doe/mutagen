# DECISIONS — Module 6: Attribute Serialization

**(a)** spec/platform-forced · **(b)** contract-forced · **(c)** our convention.

## `legacySerialize` is a full second serializer, not a flag on the first

**(c)** It re-implements the whole walk with `escapeAttrLegacy` so the reader can
diff two complete outputs, not reason about a branch. The only real difference is
the two missing `.replace` calls for `<` and `>` — everything else is identical,
which is the point.

## The module's headline result is again a negative for plain HTML re-parse

**(c)** Against `element.innerHTML = serialized`, no vector fires on a modern
browser — the four-character attribute escape closed the class. We say so
plainly and locate the *mechanism* (data-in-tree becomes markup on re-emission)
in Modules 7 and 9, where it is still live.

## Quote break-out is included as a vector that was *never* a serializer bug

**(a)** `<a title='x"><img …>'>` parses with the `"` as data (the `'` quoting
wins) and both serializers escape it. Including it prevents the reader
concluding "any special char in an attribute is dangerous" — the parser's own
quoting already handles quotes; only the entity/`<>` case needed the serializer
fix.

## IE backtick is a `const`, documented, never executed

**(b)** It depended on a non-standard IE tokenizer behaviour that no shipping
browser has. Running it would prove nothing. It exists in the source so
`lessons/01`'s timeline can point at real code.

## What We Proved

- All three vectors parse to a **safe** tree (handler is data inside an attribute).
- The modern serializer keeps all three inert on HTML re-parse.
- Modern vs legacy serialized strings differ **only** by `<`→`&lt;` and
  `>`→`&gt;` inside attribute values — verified against Chrome 148.
- A bare quote never breaks out, in either serializer.
- 10/10 assertions pass.
