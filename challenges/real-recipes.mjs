// How each open-source program of sources.json is compiled (ADR 0024). Every translation unit is
// listed explicitly, in link order, so the build never depends on a directory listing.

const LUA_CORE = [
  'lapi', 'lcode', 'lctype', 'ldebug', 'ldo', 'ldump', 'lfunc', 'lgc', 'llex', 'lmem', 'lobject', 'lopcodes',
  'lparser', 'lstate', 'lstring', 'ltable', 'ltm', 'lundump', 'lvm', 'lzio',
]
const LUA_LIBRARIES = [
  'lauxlib', 'lbaselib', 'lcorolib', 'ldblib', 'liolib', 'lmathlib', 'loadlib', 'loslib', 'lstrlib', 'ltablib',
  'lutf8lib', 'linit',
]

const ZLIB = [
  'adler32', 'compress', 'crc32', 'deflate', 'gzclose', 'gzlib', 'gzread', 'gzwrite', 'infback', 'inffast', 'inflate',
  'inftrees', 'trees', 'uncompr', 'zutil',
]

export const RECIPES = {
  lua: {
    sources: [...LUA_CORE, ...LUA_LIBRARIES, 'lua'].map((name) => `src/${name}.c`),
    includes: ['src'],
    defines: [],
    libraries: [],
  },
  bzip2: {
    sources: ['blocksort', 'huffman', 'crctable', 'randtable', 'compress', 'decompress', 'bzlib', 'bzip2'].map(
      (name) => `${name}.c`,
    ),
    includes: ['.'],
    defines: [],
    libraries: [],
  },
  md4c: {
    sources: ['src/md4c.c', 'src/entity.c', 'src/md4c-html.c', 'md2html/cmdline.c', 'md2html/md2html.c'],
    includes: ['src'],
    // md2html/CMakeLists.txt passes the project version the same way.
    defines: ['MD_VERSION_MAJOR=0', 'MD_VERSION_MINOR=6', 'MD_VERSION_RELEASE=0'],
    libraries: [],
  },
  civetweb: {
    // main.c brings the Windows tray icon and dialogs; NO_SSL leaves OpenSSL out.
    sources: ['src/civetweb.c', 'src/main.c'],
    includes: ['include'],
    defines: ['NO_SSL'],
    libraries: ['ws2_32', 'comdlg32', 'shell32', 'user32', 'gdi32', 'advapi32', 'pthread'],
  },
  zlib: {
    sources: [...ZLIB.map((name) => `${name}.c`), 'test/minigzip.c'],
    includes: ['.'],
    defines: [],
    libraries: [],
  },

  // Programs first published after the model's training data (study 3, from task file version 2 on).
  sgiemu: {
    // The `indy` Win32 front end with the r4kcore, scsicore and indycore libraries of its CMakeLists.txt.
    sources: [
      ...['src/mem/physmem', 'src/cpu/r4k', 'src/cpu/r4k_mmu', 'src/cpu/r4k_cp0', 'src/cpu/r4k_fpu', 'src/cpu/r4k_jit', 'src/cpu/r4k_disasm'],
      'src/indy/scsi_dev',
      ...['indy', 'mc', 'hpc3', 'pit8254', 'z85c30', 'ds1386', 'eeprom93', 'kbc8042', 'wd33c93', 'newport'].map((name) => `src/indy/${name}`),
      'src/frontend/png',
      'src/frontend/indy_win32',
    ].map((name) => `${name}.c`),
    includes: ['src'],
    defines: [],
    libraries: ['winmm', 'comdlg32', 'gdi32', 'user32'],
  },
  'c5xtools': {
    // The assembler, the largest of its four tools, with the shared COFF module.
    sources: ['tools/c5xasm/src/c5xasm.c', 'tools/c5xasm/src/operands.c', 'lib/c5xcoff/c5xcoff.c'],
    includes: ['include', 'lib/c5xcoff', 'tools/c5xasm/src'],
    defines: [],
    libraries: [],
  },
  'moppe-emu': {
    // The r58emu command-line emulator of its Makefile: main.o and $(OBJS).
    sources: ['main', 'z80', 'daisy', 'pio', 'sio', 'pit', 'cu53an', 'cu58af', 'r58'].map((name) => `${name}.c`),
    includes: ['.'],
    defines: [],
    libraries: [],
  },
  flint: {
    // Every .c file of its Makefile's SRCDIRS, sorted as $(sort $(wildcard ...)) does, with its flags.
    sources: [
      'src/core/memory', 'src/engine', 'src/ext', 'src/frontend/compiler', 'src/frontend/fmt', 'src/frontend/scanner',
      'src/main', 'src/pkg', 'src/runtime/chunk', 'src/runtime/http', 'src/runtime/jsonp', 'src/runtime/native',
      'src/runtime/native_math', 'src/runtime/object', 'src/runtime/profile', 'src/runtime/stringx', 'src/runtime/sys',
      'src/runtime/table', 'src/runtime/verify', 'src/runtime/vm', 'src/util/debug', 'src/util/diagnostic',
      'src/util/fl_math', 'src/util/sha256',
    ].map((name) => `${name}.c`),
    includes: ['include', 'src/core', 'src/frontend', 'src/runtime', 'src/util'],
    defines: ['_POSIX_C_SOURCE=200809L'],
    flags: ['-std=c11'],
    // The Makefile writes build/version.h; the release is 0.14.0.
    generated: { 'version.h': '#define FLINT_VERSION "0.14.0"\n' },
    libraries: ['ws2_32', 'pthread'],
  },
  vm8: {
    // The vm8 simulator and monitor (the pilot program).
    sources: ['binary_reader', 'byte_value', 'cli', 'cpu', 'cpu_state', 'cpu_trace', 'instruction_set', 'main', 'monitor', 'program'].map((name) => `src/${name}.c`),
    includes: ['include', 'src'],
    defines: [],
    libraries: [],
  },
}
