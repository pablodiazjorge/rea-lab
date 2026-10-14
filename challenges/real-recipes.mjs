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
}
