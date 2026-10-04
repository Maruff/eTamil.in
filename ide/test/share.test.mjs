// A program in a link: it must survive the round trip, in either encoding.

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { encodeShare, decodeShare, SHARE_KEY } from '../src/etamil-share-core.js'

const tamilProgram = `// __எளிய வட்டி — simple interest__
செயல் வட்டி_கணக்கு(அசல், வீதம், ஆண்டு) {
    வட்டி = அசல் * வீதம் * ஆண்டு;
    திரும்பு வட்டி;
}
தொகை = 50000;
அச்சு(வட்டி_கணக்கு(தொகை, 7.5%, 3));
`

test('the fragment key is what the page looks for', () => {
  assert.equal(SHARE_KEY, '#code=')
})

test('a Tamil program comes back exactly', async () => {
  assert.equal(await decodeShare(await encodeShare(tamilProgram)), tamilProgram)
})

test('an empty program, and one with only an astral character, round-trip', async () => {
  assert.equal(await decodeShare(await encodeShare('')), '')
  assert.equal(await decodeShare(await encodeShare('// 😀\n')), '// 😀\n')
})

test('a long program is compressed, and a short one is not made longer', async () => {
  const long = tamilProgram.repeat(40)
  const packed = await encodeShare(long)
  assert.ok(packed.startsWith('c.'), 'long text uses compression')
  assert.ok(packed.length < long.length, `${packed.length} < ${long.length}`)
  assert.equal(await decodeShare(packed), long)

  const short = await encodeShare('x = 1;')
  assert.ok(short.startsWith('p.'), 'short text stays plain')
})

test('the fragment uses only URL-safe characters', async () => {
  const text = await encodeShare(tamilProgram.repeat(5))
  assert.match(text, /^[cp]\.[A-Za-z0-9_-]+$/)
})

test('a link made without compression support still opens', async () => {
  const saved = globalThis.CompressionStream
  globalThis.CompressionStream = undefined
  try {
    const plain = await encodeShare(tamilProgram)
    assert.ok(plain.startsWith('p.'))
    globalThis.CompressionStream = saved
    assert.equal(await decodeShare(plain), tamilProgram)
  } finally {
    globalThis.CompressionStream = saved
  }
})

test('a damaged or foreign fragment gives null, not an exception', async () => {
  assert.equal(await decodeShare(''), null)
  assert.equal(await decodeShare('x'), null)
  assert.equal(await decodeShare('z.AAAA'), null)
  assert.equal(await decodeShare('c.!!!not base64!!!'), null)
  const good = await encodeShare(tamilProgram.repeat(10))
  assert.equal(await decodeShare(good.slice(0, good.length - 7)), null, 'a truncated link')
  assert.equal(await decodeShare(undefined), null)
})
