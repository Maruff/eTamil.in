// A program in a URL.
//
// The source goes after the `#`, so it is never sent to a server: a fragment stays in the
// browser. It is compressed when that makes it shorter (deflate, through the browser's own
// CompressionStream) and left as plain UTF-8 when it does not, which is the case for a
// short snippet, where the compression header costs more than it saves. A leading marker
// says which, so a link made without compression support still opens everywhere.
//
//   c.<base64url>   deflate-raw, then base64url
//   p.<base64url>   UTF-8, then base64url
//
// Pure: no DOM and no CodeMirror, so it runs under plain Node in the unit tests.

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

function toBase64Url(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function fromBase64Url(text) {
  const padded = text.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (text.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function pipe(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const compressionAvailable = () => typeof CompressionStream === 'function'

/** The fragment text (without the `#code=`) that carries `source`. */
export async function encodeShare(source) {
  const plain = encoder.encode(source)
  const plainText = 'p.' + toBase64Url(plain)
  if (!compressionAvailable()) return plainText
  try {
    const packed = await pipe(plain, new CompressionStream('deflate-raw'))
    const packedText = 'c.' + toBase64Url(packed)
    return packedText.length < plainText.length ? packedText : plainText
  } catch {
    return plainText
  }
}

/** The source a fragment carries, or null if it is not one of ours or is damaged. */
export async function decodeShare(text) {
  // A marker and a dot, then the payload, which is empty for an empty program.
  if (typeof text !== 'string' || text.length < 2 || text[1] !== '.') return null
  try {
    const bytes = fromBase64Url(text.slice(2))
    if (text[0] === 'p') return decoder.decode(bytes)
    if (text[0] === 'c' && typeof DecompressionStream === 'function') {
      return decoder.decode(await pipe(bytes, new DecompressionStream('deflate-raw')))
    }
  } catch {
    // A truncated or edited link: better to open the editor empty than to throw.
  }
  return null
}

/** The prefix of the fragment, so a page can tell a share link from any other `#`. */
export const SHARE_KEY = '#code='
