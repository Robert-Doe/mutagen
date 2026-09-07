import { parseFragment, serialize, roundTrip, treeString } from './lab.mjs';

function show(title, html, ctx = 'body', scripting = false) {
  console.log('\n### ' + title);
  console.log('input     :', JSON.stringify(html), ctx !== 'body' ? `(context <${ctx}>)` : '', scripting ? '(scripting ON)' : '');
  const tree = parseFragment(html, ctx, { scripting });
  console.log(treeString(tree).join('\n'));
  console.log('serialize :', JSON.stringify(serialize(tree)));
}

show('1 rawtext: <style> content is text', '<style><img src=x onerror=alert(1)></style>');
show('2 svg <style> is NOT rawtext', '<svg><style>abc<def>ghi</def></style></svg>');
show('3 svg breakout: <svg><p>', '<svg><p>hi</p></svg>');
show('4 svg integration point <desc>', '<svg><desc><img src=x onerror=1></desc></svg>');
show('5 rcdata title decodes entities', '<title>a &lt;b&gt; c</title>');
show('6 noscript scripting OFF', '<noscript><img src=x onerror=alert(1)></noscript>', 'body', false);
show('7 noscript scripting ON', '<noscript><img src=x onerror=alert(1)></noscript>', 'body', true);
show('8 template content in fragment', '<template><p>hi</p></template>');
show('9 attr entity kept as data', '<div title="&lt;/style&gt;&lt;img src=x onerror=1&gt;"></div>');

console.log('\n### 10 ROUND TRIP: <svg><style>&lt;a title="&lt;/style&gt;&lt;img src=x onerror=alert(1)&gt;"&gt;');
const rt = roundTrip('<svg><style><a title="</style><img src=x onerror=alert(1)>"></a></style></svg>');
rt.steps.forEach((s, i) => console.log(`  step ${i}: ${JSON.stringify(s)}`));
console.log('  stable:', rt.stable, 'iterations:', rt.iterations);

console.log('\n### 11 ROUND TRIP: <p><style></style>&lt;img&gt;  (rawtext wrapper removal shape)');
const rt2 = roundTrip('<xmp><img src=x onerror=alert(1)></xmp>');
rt2.steps.forEach((s, i) => console.log(`  step ${i}: ${JSON.stringify(s)}`));
