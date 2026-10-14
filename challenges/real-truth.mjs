// Ground truth for the real-software targets (ADR 0024). Reads the PE image, the lld map, the
// disassembly, the base relocations, the symbol table and the symbolizer's inline frames of the
// full build, and decides which functions and data objects are unambiguous enough to become a
// task. Pure functions over text and bytes, so they are tested without a toolchain.

/** Objects compiled from the program's own sources; everything else came from the toolchain. */
export const isOwnObject = (object) => object.startsWith('obj/')

const hex = (value) => `0x${value.toString(16)}`
const TOO_EASY = new Set(['main', 'wmain', 'WinMain', 'wWinMain'])

// ---------------------------------------------------------------------------------------------
// PE image

export function readPe(buffer) {
  const pe = buffer.readUInt32LE(0x3c)
  if (buffer.toString('latin1', pe, pe + 4) !== 'PE\0\0') throw new Error('not a PE image')
  const coff = pe + 4
  const sectionCount = buffer.readUInt16LE(coff + 2)
  const symbolTable = buffer.readUInt32LE(coff + 8)
  const symbolCount = buffer.readUInt32LE(coff + 12)
  const optionalSize = buffer.readUInt16LE(coff + 16)
  const optional = coff + 20
  if (buffer.readUInt16LE(optional) !== 0x20b) throw new Error('only PE32+ images are supported')
  const imageBase = Number(buffer.readBigUInt64LE(optional + 24))
  const directoryCount = buffer.readUInt32LE(optional + 108)
  const directories = []
  for (let index = 0; index < directoryCount; index++) {
    const at = optional + 112 + index * 8
    directories.push({ rva: buffer.readUInt32LE(at), size: buffer.readUInt32LE(at + 4) })
  }
  const stringTable = symbolTable + symbolCount * 18
  const sections = []
  for (let index = 0, at = optional + optionalSize; index < sectionCount; index++, at += 40) {
    let name = buffer.toString('latin1', at, at + 8).replace(/\0+$/, '')
    if (name.startsWith('/') && symbolTable > 0) {
      const start = stringTable + Number(name.slice(1))
      name = buffer.toString('latin1', start, buffer.indexOf(0, start))
    }
    sections.push({
      name,
      virtualSize: buffer.readUInt32LE(at + 8),
      rva: buffer.readUInt32LE(at + 12),
      rawSize: buffer.readUInt32LE(at + 16),
      rawPointer: buffer.readUInt32LE(at + 20),
    })
  }
  return { imageBase, symbolTable, symbolCount, directories, sections }
}

export const sectionBytes = (buffer, section) =>
  buffer.subarray(section.rawPointer, section.rawPointer + Math.min(section.virtualSize, section.rawSize))

const isDebugSection = (name) => name.startsWith('.debug')

/** The bytes of the image at a relative virtual address, or undefined outside every section. */
export function bytesAt(buffer, pe, rva, length) {
  const section = pe.sections.find((candidate) => rva >= candidate.rva && rva + length <= candidate.rva + candidate.virtualSize)
  if (!section || rva - section.rva + length > section.rawSize) return undefined
  const offset = section.rawPointer + rva - section.rva
  return buffer.subarray(offset, offset + length)
}

/** Every non-debug section of the full build must be in the target at the same address with the same bytes. */
export function compareImages(fullBuffer, targetBuffer) {
  const full = readPe(fullBuffer)
  const target = readPe(targetBuffer)
  const problems = []
  if (full.imageBase !== target.imageBase) problems.push('image base differs')
  const kept = full.sections.filter((section) => !isDebugSection(section.name))
  if (kept.length !== target.sections.length) problems.push(`target has ${target.sections.length} sections, full build ${kept.length} non-debug ones`)
  for (const section of kept) {
    const other = target.sections.find((candidate) => candidate.name === section.name)
    if (!other) problems.push(`${section.name} missing from the target`)
    else if (other.rva !== section.rva || other.virtualSize !== section.virtualSize) problems.push(`${section.name} moved or resized`)
    else if (!sectionBytes(fullBuffer, section).equals(sectionBytes(targetBuffer, other))) problems.push(`${section.name} bytes differ`)
  }
  return problems
}

/**
 * What the target must not give away: symbols, exports, a debug record that is not all zeros, or
 * text naming the build machine. `forbidden` holds strings that must not appear anywhere (for
 * example the account name), passed in at run time so no personal value is written in the source.
 */
export function checkTargetImage(buffer, forbidden = []) {
  const pe = readPe(buffer)
  const problems = []
  if (pe.symbolTable !== 0 || pe.symbolCount !== 0) problems.push('symbol table present')
  if ((pe.directories[0]?.size ?? 0) !== 0) problems.push('export directory present')
  const debug = pe.directories[6]
  if (debug && debug.size > 0) {
    for (let offset = 0; offset < debug.size; offset += 28) {
      const entry = bytesAt(buffer, pe, debug.rva + offset, 28)
      if (!entry) continue
      const size = entry.readUInt32LE(16)
      const pointer = entry.readUInt32LE(24)
      if (!buffer.subarray(pointer, pointer + size).every((byte) => byte === 0)) problems.push('debug record carries data')
    }
  }
  const text = buffer.toString('latin1')
  if (/[A-Za-z]:[\\/]+Users[\\/]/i.test(text)) problems.push('a local user path appears in the image')
  for (const value of forbidden) {
    if (value && text.toLowerCase().includes(value.toLowerCase())) problems.push('a forbidden local value appears in the image')
  }
  return problems
}

/** RUNTIME_FUNCTION entries of .pdata, as relative addresses. */
export function readPdata(buffer, pe) {
  const section = pe.sections.find((candidate) => candidate.name === '.pdata')
  if (!section) return []
  const bytes = sectionBytes(buffer, section)
  const entries = []
  for (let at = 0; at + 12 <= bytes.length; at += 12) {
    const begin = bytes.readUInt32LE(at)
    if (begin === 0) continue
    entries.push({ begin, end: bytes.readUInt32LE(at + 4) })
  }
  return entries
}

// ---------------------------------------------------------------------------------------------
// Tool output

/** The lld map: output sections, their input sections with owning object, and symbols. */
export function parseMap(text) {
  const outputs = []
  let output
  let input
  for (const line of text.split(/\r?\n/)) {
    const match = /^([0-9a-f]{8,16}) ([0-9a-f]{8,16}) +(\d+)( +)(\S.*)$/i.exec(line)
    if (!match) continue
    const rva = Number.parseInt(match[1], 16)
    const size = Number.parseInt(match[2], 16)
    const indent = match[4].length
    const rest = match[5].trim()
    if (indent <= 4) {
      output = { name: rest, rva, size, inputs: [] }
      outputs.push(output)
      input = undefined
    } else if (indent <= 12) {
      const parts = /^(.*):\(([^)]*)\)$/.exec(rest)
      input = { object: parts ? parts[1] : rest, section: parts ? parts[2] : '', rva, size, symbols: [] }
      output?.inputs.push(input)
    } else {
      input?.symbols.push({ name: rest, rva })
    }
  }
  return outputs
}

/** `llvm-objdump -d --no-show-raw-insn` lines: address, mnemonic, direct target and RIP-relative target. */
export function parseDisassembly(text) {
  const instructions = []
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([0-9a-f]+):\s+([a-z][a-z0-9.]*)\s*(.*?)\s*$/.exec(line)
    if (!match) continue
    const [, address, mnemonic, rest] = match
    const operands = rest.split('#')[0].trim()
    const direct = /^(?:call|jmp|j[a-z]+)/.test(mnemonic) ? /^0x([0-9a-f]+)\b/.exec(operands) : null
    const relative = /#\s*0x([0-9a-f]+)/.exec(rest)
    instructions.push({
      address: Number.parseInt(address, 16),
      mnemonic,
      direct: direct ? Number.parseInt(direct[1], 16) : undefined,
      memory: relative ? Number.parseInt(relative[1], 16) : undefined,
    })
  }
  return instructions
}

/** `llvm-nm -n --defined-only`: name to the addresses it is defined at. */
export function parseNm(text) {
  const names = new Map()
  for (const line of text.split(/\r?\n/)) {
    const match = /^([0-9a-f]+) \w (.+)$/.exec(line.trim())
    if (!match) continue
    const list = names.get(match[2]) ?? []
    list.push(Number.parseInt(match[1], 16))
    names.set(match[2], list)
  }
  return names
}

/** `llvm-readobj --coff-basereloc`: relative addresses of the 64-bit absolute pointers. */
export function parseBaseRelocations(text) {
  const addresses = []
  let type
  for (const line of text.split(/\r?\n/)) {
    const typeMatch = /Type:\s*(\w+)/.exec(line)
    if (typeMatch) type = typeMatch[1]
    const addressMatch = /Address:\s*0x([0-9a-f]+)/i.exec(line)
    if (addressMatch && type === 'DIR64') addresses.push(Number.parseInt(addressMatch[1], 16))
  }
  return addresses
}

/** `llvm-symbolizer --inlines --output-style=JSON`: per address, function names from innermost to outermost. */
export function parseSymbolizer(text) {
  const frames = new Map()
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const record = JSON.parse(line)
    frames.set(Number.parseInt(record.Address, 16), (record.Symbol ?? []).map((frame) => frame.FunctionName))
  }
  return frames
}

// ---------------------------------------------------------------------------------------------
// Program model

const printable = (byte) => (byte >= 0x20 && byte <= 0x7e) || byte === 0x09 || byte === 0x0a || byte === 0x0d

/** NUL-terminated printable strings inside the unnamed constant pools of the program's own objects. */
export function findStrings(buffer, pe, pools, minimum = 4) {
  const strings = []
  for (const pool of pools) {
    const bytes = bytesAt(buffer, pe, pool.start - pe.imageBase, pool.size)
    if (!bytes) continue
    let start = 0
    for (let index = 0; index <= bytes.length; index++) {
      if (index < bytes.length && bytes[index] !== 0) continue
      const piece = bytes.subarray(start, index)
      if (piece.length >= minimum && piece.every(printable)) {
        strings.push({ address: pool.start + start, text: piece.toString('latin1'), object: pool.object })
      }
      start = index + 1
    }
  }
  return strings
}

/** Functions, data objects and string pools of the program's own objects, from the map. */
export function modelFromMap(outputs, imageBase) {
  const functions = []
  const data = []
  const pools = []
  const unsplit = []
  for (const output of outputs) {
    for (const input of output.inputs) {
      if (!isOwnObject(input.object) || input.size === 0) continue
      const start = imageBase + input.rva
      if (output.name === '.text') {
        // Cold or hot code keeps its own section with a prefix, such as .text$unlikely$error.
        if (input.section.startsWith('.text$')) functions.push({ name: input.section.slice(6).replace(/^(?:unlikely|hot|startup|exit)\$/, ''), object: input.object, start, size: input.size, end: start + input.size, symbols: input.symbols.map((symbol) => symbol.name) })
        else unsplit.push({ object: input.object, section: input.section, start, size: input.size })
      } else if (output.name === '.rdata' || output.name === '.data') {
        const prefix = `${output.name}$`
        if (input.section.startsWith(prefix)) data.push({ name: input.section.slice(prefix.length), section: output.name, object: input.object, start, size: input.size, end: start + input.size })
        else if (output.name === '.rdata') pools.push({ object: input.object, start, size: input.size })
      }
    }
  }
  functions.sort((a, b) => a.start - b.start)
  data.sort((a, b) => a.start - b.start)
  return { functions, data, pools, unsplit }
}

function locator(items) {
  return (address) => {
    let low = 0
    let high = items.length - 1
    while (low <= high) {
      const middle = (low + high) >> 1
      const item = items[middle]
      if (address < item.start) high = middle - 1
      else if (address >= item.end) low = middle + 1
      else return item
    }
    return undefined
  }
}

/**
 * Decides every fact the families rely on and the candidates per family. `input` holds the model
 * from the map, the image (buffer and parsed PE), the parsed tool outputs and the strings.
 */
export function analyse(input) {
  const { model, buffer, pe, instructions, nm, relocations, frames, pdata, strings } = input
  const { functions, data } = model
  const functionAt = locator(functions)
  const dataAt = locator(data)
  const byStart = new Map(functions.map((fn) => [fn.start, fn]))
  const stringItems = strings.map((string) => ({ ...string, start: string.address, end: string.address + string.text.length + 1 }))
  stringItems.sort((a, b) => a.start - b.start)
  const stringAt = locator(stringItems)
  const readPointer = (address) => {
    const bytes = bytesAt(buffer, pe, address - pe.imageBase, 8)
    return bytes ? Number(bytes.readBigUInt64LE(0)) : undefined
  }
  const refptrs = new Map(data.filter((item) => item.name.startsWith('.refptr.')).map((item) => [item.start, readPointer(item.start)]))

  const facts = new Map(functions.map((fn) => [fn, { callers: new Set(), callSites: 0, addressTaken: false, namedPointer: false, stringRefs: [], dataRefs: new Set(), firstInstruction: undefined }]))
  const stringRefs = new Map(stringItems.map((string) => [string, []]))
  const dataRefs = new Map(data.map((item) => [item, new Set()]))

  for (const instruction of instructions) {
    const owner = functionAt(instruction.address)
    if (!owner) continue
    const fact = facts.get(owner)
    if (fact.firstInstruction === undefined) fact.firstInstruction = instruction
    if (instruction.direct !== undefined) {
      const target = byStart.get(instruction.direct)
      if (target && target !== owner) {
        facts.get(target).callers.add(owner)
        facts.get(target).callSites += 1
      }
      continue
    }
    if (instruction.memory === undefined) continue
    let address = instruction.memory
    if (refptrs.has(address)) address = refptrs.get(address)
    if (address === undefined) continue
    const target = byStart.get(address)
    if (target && !instruction.mnemonic.startsWith('call')) facts.get(target).addressTaken = true
    const string = stringAt(address)
    if (string && string.start === address) {
      stringRefs.get(string).push(owner)
      fact.stringRefs.push(string)
    }
    const item = dataAt(address)
    if (item) {
      dataRefs.get(item).add(owner)
      fact.dataRefs.add(item)
    }
  }

  // A data object that holds absolute pointers is a table of strings or functions, not of numbers.
  const pointersIn = new Map(data.map((item) => [item, 0]))
  for (const relocation of relocations) {
    const owner = dataAt(pe.imageBase + relocation)
    if (owner) pointersIn.set(owner, pointersIn.get(owner) + 1)
  }

  for (const relocation of relocations) {
    const address = pe.imageBase + relocation
    const value = readPointer(address)
    const target = value === undefined ? undefined : byStart.get(value)
    if (!target || functionAt(address)) continue
    const fact = facts.get(target)
    fact.addressTaken = true
    for (const neighbour of [address - 8, address + 8]) {
      const pointed = readPointer(neighbour)
      if (pointed !== undefined && stringAt(pointed)) fact.namedPointer = true
    }
  }

  const inlined = new Set()
  for (const list of frames.values()) for (const name of list.slice(0, -1)) inlined.add(name)

  const nameCount = new Map()
  for (const fn of functions) nameCount.set(fn.name, (nameCount.get(fn.name) ?? 0) + 1)
  const dataNameCount = new Map()
  for (const item of data) dataNameCount.set(item.name, (dataNameCount.get(item.name) ?? 0) + 1)
  const bodyOf = (fn) => bytesAt(buffer, pe, fn.start - pe.imageBase, fn.size)?.toString('hex')
  const bodies = new Map()
  for (const fn of functions) {
    const body = bodyOf(fn)
    bodies.set(body, (bodies.get(body) ?? 0) + 1)
  }

  const functionRecords = functions.map((fn) => {
    const fact = facts.get(fn)
    const reasons = []
    if (fn.name.includes('.')) reasons.push('clone or local suffix')
    if (TOO_EASY.has(fn.name)) reasons.push('program entry')
    if (nameCount.get(fn.name) > 1) reasons.push('name defined in more than one object')
    if (fn.size < 16) reasons.push('smaller than 16 bytes')
    if (fact.firstInstruction?.mnemonic.startsWith('jmp') && fn.size < 32) reasons.push('jump thunk')
    if (inlined.has(fn.name)) reasons.push('inlined elsewhere')
    if (bodies.get(bodyOf(fn)) > 1) reasons.push('identical twin')
    const begin = fn.start - pe.imageBase
    const end = fn.end - pe.imageBase
    const unwind = pdata.filter((entry) => entry.begin >= begin && entry.begin < end)
    if (unwind.length > 1 || unwind.some((entry) => entry.begin !== begin || entry.end > end)) reasons.push('unwind data split or misaligned')
    if (!(nm.get(fn.name) ?? []).includes(fn.start)) reasons.push('symbol table disagrees with the map')
    if (!fn.symbols.includes(fn.name)) reasons.push('map lists no symbol for the section')
    return { fn, fact, reasons }
  })
  const recordOf = new Map(functionRecords.map((record) => [record.fn, record]))
  const eligible = (fn) => recordOf.get(fn).reasons.length === 0

  const textCount = new Map()
  for (const string of stringItems) textCount.set(string.text, (textCount.get(string.text) ?? 0) + 1)
  const anchorsOf = (fn) =>
    facts
      .get(fn)
      .stringRefs.filter(
        (string, index, list) =>
          list.indexOf(string) === index &&
          string.text.length >= 8 &&
          (string.text.match(/[A-Za-z]/g) ?? []).length >= 4 &&
          textCount.get(string.text) === 1 &&
          stringRefs.get(string).length === 1,
      )

  const candidates = { string: [], behaviour: [], caller: [], chain: [], data: [] }
  // A function that only its behaviour can identify: no string reference, address never taken, called directly.
  const describable = (fn) => {
    const fact = facts.get(fn)
    return fact.stringRefs.length === 0 && !fact.addressTaken && fact.callers.size >= 1 && fn.size >= 64
  }
  for (const fn of functions) {
    if (!eligible(fn)) continue
    const anchors = anchorsOf(fn)
    if (anchors.length > 0) candidates.string.push({ function: fn.name, strings: anchors.map((string) => string.text) })
    if (describable(fn)) candidates.behaviour.push({ function: fn.name })
  }
  // Two steps: the only direct caller of a function that is described by its behaviour.
  for (const callee of functions) {
    if (!eligible(callee) || !describable(callee) || facts.get(callee).callers.size !== 1) continue
    const [caller] = facts.get(callee).callers
    if (caller !== callee && eligible(caller)) candidates.chain.push({ function: caller.name, callee: callee.name })
  }
  for (const callee of functions) {
    const fact = facts.get(callee)
    const anchors = anchorsOf(callee)
    if (anchors.length === 0 || fact.addressTaken || fact.callers.size !== 1 || recordOf.get(callee).reasons.includes('inlined elsewhere')) continue
    const [caller] = fact.callers
    if (caller !== callee && eligible(caller)) candidates.caller.push({ function: caller.name, callee: callee.name, strings: anchors.map((string) => string.text) })
  }
  for (const item of data) {
    // A plain name or a function-local static (function.table); compiler-made names start with a dot.
    if (!/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?$/.test(item.name) || dataNameCount.get(item.name) > 1 || item.size < 32) continue
    if (dataRefs.get(item).size === 0 || pointersIn.get(item) > 0) continue
    const bytes = bytesAt(buffer, pe, item.start - pe.imageBase, item.size)
    if (!bytes) continue
    const printableShare = bytes.filter(printable).length / bytes.length
    if (printableShare >= 0.5) continue
    candidates.data.push({ object: item.name })
  }

  return {
    functions: functionRecords.map(({ fn, fact, reasons }) => ({
      name: fn.name,
      object: fn.object,
      start: hex(fn.start),
      end: hex(fn.end),
      size: fn.size,
      callers: [...fact.callers].map((caller) => caller.name).sort(),
      address_taken: fact.addressTaken,
      named_pointer: fact.namedPointer,
      string_refs: fact.stringRefs.length,
      reasons,
    })),
    data: data.map((item) => ({ name: item.name, section: item.section, object: item.object, start: hex(item.start), end: hex(item.end), size: item.size, pointers: pointersIn.get(item), referenced_by: [...dataRefs.get(item)].map((fn) => fn.name).sort() })),
    strings: stringItems.map((string) => ({ address: hex(string.address), text: string.text, referenced_by: stringRefs.get(string).map((fn) => fn.name) })),
    candidates,
  }
}
