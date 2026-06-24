const DECODE_HIGH = [
  'A', 'A', 'C', 'E', 'N', 'O', 'U', 'a', 'a', 'a', 'a', 'a', 'a', 'c', 'e', 'e',
  'e', 'e', 'i', 'i', 'i', 'i', 'n', 'o', 'o', 'o', 'o', 'o', 'u', 'u', 'u', 'u',
  '+', 'deg', 'c', 'GBP', 'S', '*', 'P', 'ss', 'R', 'C', 'TM', "'", '"', '!=', 'AE', 'O',
  'inf', '+-', '<=', '>=', 'yen', 'u', 'd', 'sum', 'Pi', 'pi', 'int', 'ordf', 'ordm', 'Omega', 'ae', 'o',
  '?', '!', 'not', 'sqrt', 'f', '~', 'Delta', '<<', '>>', '...', ' ', 'A', 'A', 'O', 'OE', 'oe',
  '-', '-', '"', '"', "'", "'", '/', 'lozenge', 'y', 'Y', '/', 'EUR', '<', '>', 'fi', 'fl',
  'dblDagger', '.', ',', 'quotesinglbase', '"', 'A', 'E', 'A', 'E', 'E', 'I', 'I', 'I', 'I', 'O',
  'O', 'apple', 'O', 'U', 'U', 'U', 'i', '^', '~', 'macron', 'breve', 'dot', 'ring', 'cedilla', 'hungarumlaut', 'ogonek',
  'caron',
]

const ENCODE_ASCII = new Map<string, number>()
for (let i = 0x20; i <= 0x7e; i++) {
  ENCODE_ASCII.set(String.fromCharCode(i), i)
}

export function decodeMacRoman(bytes: ArrayLike<number>): string {
  let text = ''
  for (let i = 0; i < bytes.length; i++) {
    const value = bytes[i]
    if (value === 0) {
      break
    }
    if (value < 0x80) {
      text += String.fromCharCode(value)
    } else {
      text += DECODE_HIGH[value - 0x80] ?? '?'
    }
  }
  return text
}

export function encodeMacRoman(text: string): number[] {
  const bytes: number[] = []
  for (const ch of text) {
    const value = ENCODE_ASCII.get(ch)
    if (value === undefined) {
      throw new Error(`"${ch}" is not supported by the editor's MacRoman encoder`)
    }
    bytes.push(value)
  }
  return bytes
}
