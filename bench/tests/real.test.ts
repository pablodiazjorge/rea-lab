import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  analyse,
  checkTargetImage,
  compareImages,
  findStrings,
  modelFromMap,
  parseBaseRelocations,
  parseDisassembly,
  parseMap,
  parseNm,
  parseSymbolizer,
  readPe,
} from '../../challenges/real-truth.mjs'

const IMAGE_BASE = 0x140000000

type Section = { name: string; rva: number; bytes: Buffer }

/** A minimal PE32+ image: headers, a section table and raw data, enough for readPe and the checks. */
function makePe(sections: Section[], options: { symbolTable?: number; exportSize?: number } = {}): Buffer {
  const header = 0x400
  let raw = header
  const placed = sections.map((section) => {
    const rawSize = Math.max(0x200, Math.ceil(section.bytes.length / 0x200) * 0x200)
    const item = { ...section, rawPointer: raw, rawSize }
    raw += rawSize
    return item
  })
  const buffer = Buffer.alloc(raw)
  buffer.writeUInt32LE(0x80, 0x3c)
  buffer.write('PE\0\0', 0x80, 'latin1')
  const coff = 0x84
  buffer.writeUInt16LE(0x8664, coff)
  buffer.writeUInt16LE(sections.length, coff + 2)
  buffer.writeUInt32LE(options.symbolTable ?? 0, coff + 8)
  const optionalSize = 112 + 16 * 8
  buffer.writeUInt16LE(optionalSize, coff + 16)
  const optional = coff + 20
  buffer.writeUInt16LE(0x20b, optional)
  buffer.writeBigUInt64LE(BigInt(IMAGE_BASE), optional + 24)
  buffer.writeUInt32LE(16, optional + 108)
  if (options.exportSize) {
    buffer.writeUInt32LE(0x3000, optional + 112)
    buffer.writeUInt32LE(options.exportSize, optional + 116)
  }
  let at = optional + optionalSize
  for (const section of placed) {
    buffer.write(section.name, at, 'latin1')
    buffer.writeUInt32LE(section.bytes.length, at + 8)
    buffer.writeUInt32LE(section.rva, at + 12)
    buffer.writeUInt32LE(section.rawSize, at + 16)
    buffer.writeUInt32LE(section.rawPointer, at + 20)
    section.bytes.copy(buffer, section.rawPointer)
    at += 40
  }
  return buffer
}

// Three functions in one object: alpha calls beta and gamma, beta prints a message, gamma reads a table.
const MAP = [
  'Address  Size     Align Out     In      Symbol',
  '00001000 00000100  4096 .text',
  '00001000 00000060    16         obj/a.o:(.text$alpha)',
  '00001000 00000000     0                 alpha',
  '00001060 00000040    16         obj/a.o:(.text$beta)',
  '00001060 00000000     0                 beta',
  '000010a0 00000050    16         obj/a.o:(.text$unlikely$gamma)',
  '000010a0 00000000     0                 gamma',
  '000010f0 00000010    16         C:/toolchain/lib/crt2.o:(.text)',
  '000010f0 00000000     0                 mainCRTStartup',
  '00002000 00000060  4096 .rdata',
  '00002000 00000017     1         obj/a.o:(.rdata)',
  '00002020 00000040    16         obj/a.o:(.rdata$table)',
  '00002020 00000000     0                 table',
].join('\n')

const DISASSEMBLY = [
  '0000000140001000 <alpha>:',
  '140001000:     \tpushq\t%rbx',
  '140001001:     \tcallq\t0x140001060 <beta>',
  '140001006:     \tcallq\t0x1400010a0 <gamma>',
  '14000100b:     \tjmp\t0x140001020 <alpha+0x20>',
  '0000000140001060 <beta>:',
  '140001060:     \tleaq\t0xf99(%rip), %rcx     # 0x140002000 <.rdata>',
  '140001067:     \tretq',
  '00000001400010a0 <gamma>:',
  '1400010a0:     \tmovl\t0xf7a(%rip), %eax     # 0x140002020 <table>',
  '1400010a6:     \tretq',
].join('\n')

const NM = ['0000000140001000 T alpha', '0000000140001060 t beta', '00000001400010a0 t gamma', '0000000140002020 r table'].join('\n')

function image(): Buffer {
  const text = Buffer.alloc(0x100)
  text.fill(0x11, 0x00, 0x60)
  text.fill(0x22, 0x60, 0xa0)
  text.fill(0x33, 0xa0, 0xf0)
  const rdata = Buffer.alloc(0x60)
  rdata.write('unexpected end of file\0', 0, 'latin1')
  for (let index = 0; index < 0x40; index++) rdata[0x20 + index] = 0x80 + index
  return makePe([
    { name: '.text', rva: 0x1000, bytes: text },
    { name: '.rdata', rva: 0x2000, bytes: rdata },
  ])
}

function scenario(frames = new Map<number, string[]>()) {
  const buffer = image()
  const pe = readPe(buffer)
  const model = modelFromMap(parseMap(MAP), pe.imageBase)
  return analyse({
    model,
    buffer,
    pe,
    instructions: parseDisassembly(DISASSEMBLY),
    nm: parseNm(NM),
    relocations: [],
    frames,
    pdata: [],
    strings: findStrings(buffer, pe, model.pools),
  })
}

test('the map gives own functions, data and string pools, and leaves toolchain code out', () => {
  const model = modelFromMap(parseMap(MAP), IMAGE_BASE)
  assert.deepEqual(
    model.functions.map((fn: { name: string; start: number; size: number }) => [fn.name, fn.start, fn.size]),
    [
      ['alpha', 0x140001000, 0x60],
      ['beta', 0x140001060, 0x40],
      ['gamma', 0x1400010a0, 0x50],
    ],
  )
  assert.deepEqual(model.data.map((item: { name: string }) => item.name), ['table'])
  assert.deepEqual(model.pools, [{ object: 'obj/a.o', start: 0x140002000, size: 0x17 }])
})

test('the disassembly separates direct calls, jumps and RIP-relative references', () => {
  const [call, viaMemory, branch, load] = parseDisassembly(
    [
      '140001001:     \tcallq\t0x140001060 <beta>',
      '1400010cd:     \tcallq\t*0x1bfc5(%rip)          # 0x14001d098 <__imp_Sleep>',
      '14000147d:     \tjne\t0x1400014aa <adler32_z+0x3a>',
      '140001060:     \tleaq\t0xf99(%rip), %rcx     # 0x140002000 <.rdata>',
    ].join('\n'),
  )
  assert.equal(call.direct, 0x140001060)
  assert.equal(viaMemory.direct, undefined)
  assert.equal(viaMemory.memory, 0x14001d098)
  assert.equal(branch.direct, 0x1400014aa)
  assert.equal(load.memory, 0x140002000)
})

test('tool outputs parse: nm, base relocations and symbolizer frames', () => {
  assert.deepEqual(parseNm(NM).get('beta'), [0x140001060])
  const relocations = parseBaseRelocations('  Entry {\n    Type: DIR64\n    Address: 0x2040\n  }\n  Entry {\n    Type: ABSOLUTE\n    Address: 0x2000\n  }')
  assert.deepEqual(relocations, [0x2040])
  const frames = parseSymbolizer(
    '{"Address":"0x140001006","ModuleName":"full.exe","Symbol":[{"FunctionName":"beta"},{"FunctionName":"alpha"}]}\n',
  )
  assert.deepEqual(frames.get(0x140001006), ['beta', 'alpha'])
})

test('each family gets the candidates its definition allows', () => {
  const truth = scenario()
  assert.deepEqual(truth.candidates.string, [{ function: 'beta', strings: ['unexpected end of file'] }])
  assert.deepEqual(truth.candidates.caller, [{ function: 'alpha', callee: 'beta', strings: ['unexpected end of file'] }])
  assert.deepEqual(truth.candidates.behaviour, [{ function: 'gamma' }])
  assert.deepEqual(truth.candidates.chain, [{ function: 'alpha', callee: 'gamma' }])
  assert.deepEqual(truth.candidates.data, [{ object: 'table' }])
  const gamma = truth.functions.find((fn: { name: string }) => fn.name === 'gamma')
  assert.deepEqual(gamma, {
    name: 'gamma',
    object: 'obj/a.o',
    start: '0x1400010a0',
    end: '0x1400010f0',
    size: 0x50,
    callers: ['alpha'],
    address_taken: false,
    named_pointer: false,
    string_refs: 0,
    reasons: [],
  })
})

test('a function inlined anywhere is never a target or a callee anchor', () => {
  const truth = scenario(new Map([[0x140001006, ['beta', 'alpha']]]))
  const beta = truth.functions.find((fn: { name: string }) => fn.name === 'beta')
  assert.ok(beta.reasons.includes('inlined elsewhere'))
  assert.deepEqual(truth.candidates.string, [])
  assert.deepEqual(truth.candidates.caller, [])
})

test('the target must keep the full build bytes and give nothing away', () => {
  const full = image()
  assert.deepEqual(compareImages(full, Buffer.from(full)), [])
  const changed = Buffer.from(full)
  changed[0x400] ^= 0xff
  assert.deepEqual(compareImages(full, changed), ['.text bytes differ'])

  assert.deepEqual(checkTargetImage(full, ['someone']), [])
  assert.deepEqual(checkTargetImage(makePe([{ name: '.text', rva: 0x1000, bytes: Buffer.alloc(16) }], { symbolTable: 0x600 })), ['symbol table present'])
  assert.deepEqual(checkTargetImage(makePe([{ name: '.text', rva: 0x1000, bytes: Buffer.alloc(16) }], { exportSize: 0x40 })), ['export directory present'])
  // Built at run time so the repository check never sees a literal user path in this file.
  const path = ['C:', 'Users', 'someone', 'src', 'x.c'].join('\\')
  const leaky = makePe([{ name: '.rdata', rva: 0x2000, bytes: Buffer.from(`${path}\0`, 'latin1') }])
  assert.deepEqual(checkTargetImage(leaky, ['someone']), ['a local user path appears in the image', 'a forbidden local value appears in the image'])
})

test('draw quotas apply to every program, and one program can override a family', async () => {
  const { parseQuotas } = await import('../../challenges/real-tasks.mjs')
  assert.deepEqual(parseQuotas('behaviour=6,chain=2,c5xtools:chain=1,moppe-emu:chain=1'), {
    quotas: { behaviour: 6, chain: 2 },
    overrides: { c5xtools: { chain: 1 }, 'moppe-emu': { chain: 1 } },
  })
  assert.throws(() => parseQuotas('behaviour=6,c5xtools:data=1'), /overrides a family without a quota/)
  assert.throws(() => parseQuotas('behaviour=0'), /bad quota/)
  assert.throws(() => parseQuotas('caller=1'), /bad quota/)
})

test('task files are checked against the ground truth and resolved into address ranges', async () => {
  const { QUOTAS, resolveTasks, verifyTasks } = await import('../../challenges/real-tasks.mjs')
  const truth = { ...scenario(), image_base: '0x140000000' }
  const tasks = {
    set: 'real',
    role: 'pilot',
    version: 1,
    quotas: { string: 1, behaviour: 1, caller: 1, data: 1 },
    tasks: [
      { id: 'p01', program: 'demo', family: 'string', target: { function: 'beta', string: 'unexpected end of file' }, question: 'Which function references the string?' },
      { id: 'p02', program: 'demo', family: 'behaviour', target: { function: 'gamma' }, question: 'The function that reads the table.' },
      { id: 'p03', program: 'demo', family: 'caller', target: { function: 'alpha', callee: 'beta', string: 'unexpected end of file' }, question: 'The caller.' },
      { id: 'p04', program: 'demo', family: 'data', target: { object: 'table' }, question: 'The 64 bytes that the reader uses.' },
    ],
    rejected: [],
  }
  assert.deepEqual(QUOTAS, { string: 1, behaviour: 3, chain: 1, data: 1 })
  assert.deepEqual(verifyTasks(tasks, { demo: truth }), [])

  const broken = structuredClone(tasks)
  broken.tasks[1].question = 'The function gamma.'
  broken.tasks[2].target = { function: 'gamma', callee: 'beta', string: 'unexpected end of file' }
  broken.tasks[3].question = ''
  assert.deepEqual(verifyTasks(broken, { demo: truth }), [
    'p02: the question names the source identifier gamma',
    'p03: another task of demo has the same answer',
    'p03: no longer a caller candidate',
    'p04: question missing',
  ])

  const resolved = resolveTasks(tasks, { demo: truth }, 'abc')
  assert.equal(resolved.tasks_sha256, 'abc')
  assert.deepEqual(
    resolved.tasks.map((task: { id: string; answer: unknown }) => [task.id, task.answer]),
    [
      ['p01', { kind: 'function', name: 'beta', start: '0x140001060', end: '0x1400010a0', image_base: '0x140000000' }],
      ['p02', { kind: 'function', name: 'gamma', start: '0x1400010a0', end: '0x1400010f0', image_base: '0x140000000' }],
      ['p03', { kind: 'function', name: 'alpha', start: '0x140001000', end: '0x140001060', image_base: '0x140000000' }],
      ['p04', { kind: 'data', name: 'table', start: '0x140002020', end: '0x140002060', image_base: '0x140000000' }],
    ],
  )
})
