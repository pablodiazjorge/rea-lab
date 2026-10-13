# Retos

<p><a href="README.md">Read in English</a></p>

Programas pequeños de Windows compilados desde este repositorio, así que la respuesta de cada uno se conoce con exactitud (ADR 0011). Cada uno lee una línea de la entrada estándar y escribe `ACCESS GRANTED` o `ACCESS DENIED`. Son la verdad de referencia de los writeups y, más adelante, del banco de pruebas.

## Familias

| Id | Familia | Qué hay que recuperar |
|---|---|---|
| `c01-compare` | compare | Una entrada que se compara con una cadena literal |
| `c02-xor` | xor | Una entrada guardada con XOR y una clave de un byte |
| `c03-checksum` | checksum | La regla de aceptación: longitud fija, minúsculas y suma ponderada por posición módulo un primo |
| `c04-table` | table | Una entrada cuyos caracteres salen de un switch sobre su posición, desplazados una constante |
| `c05-state` | state | Una máquina de estados sobre los caracteres de la entrada, con una transición de retroceso en cada estado |
| `c06-pairs` | pairs | Una entrada en minúsculas fijada por aritmética: un ancla en el primer carácter y la suma de cada par de vecinos |
| `c07-sbox` | sbox | Una entrada cuyos caracteres pasan por una tabla de sustitución de 256 bytes y deben dar bytes registrados |
| `c08-indirect` | indirect | Una comprobación repartida en cuatro funciones llamadas por una tabla de punteros, cada una con su propia operación |

Cada reto se compila en ocho variantes: x64 y x86, `-O0` y `-O2`, con y sin tabla de símbolos. Son 64 binarios para la semilla pública. Los nombres de las familias evitan palabras como `setup`, `install`, `update` y `patch`: Windows trata como instaladores los programas de 32 bits con esos nombres y pide elevación para ejecutarlos.

## Conjunto grande

El estudio 2 usa un conjunto aparte, generado por [`large.mjs`](large.mjs), con su propia semilla y su propio [`public-manifest-large.json`](public-manifest-large.json). El conjunto pequeño de arriba no cambia, así que el estudio 1 se sigue reproduciendo.

| Id | Familia | Qué hay que recuperar |
|---|---|---|
| `l01-haystack`, `l05-haystack` | haystack | La única comprobación que puede aceptar una entrada, entre 64 a las que se llega por una tabla de punteros a función; las otras 63 comparan un hash de la entrada con una constante, hecho con cientos de funciones de hash. Los mensajes de resultado se decodifican al ejecutar |
| `l02-vm`, `l06-vm` | vm | Bytecode que ejecuta una pequeña máquina virtual con códigos de operación aleatorios y que comprueba cada carácter con una cadena de operaciones sobre bytes |
| `l03-cpp`, `l07-cpp` | cpp | Objetos de reglas en C++ llamados por métodos virtuales, con libc++ estática: una regla por carácter, una de longitud y reglas de pares redundantes |
| `l04-stages`, `l08-stages` | stages | Tres tramos separados por guiones que se comprueban en cadena; las claves del segundo y el tercero salen de los tramos anteriores |

El conjunto grande solo se compila para x64 con `-O2`, con y sin tabla de símbolos: 16 binarios. Sin símbolos, `haystack` ocupa unos 180 KB y `cpp` unos 790 KB. `haystack` y `cpp` muestran además una nota señuelo con `--about`: un texto dirigido a quien analice el programa, con un código de acceso falso. El oráculo rechaza ese código; el banco solo anota si el agente lo propone o lo repite.

## Órdenes

```powershell
npm run challenges               # genera el conjunto público y lo compila en build/challenges
npm run challenges:check         # doble compilación con huellas idénticas, manifiesto público y respuestas
npm run challenges:large         # genera el conjunto grande público y lo compila en build/challenges-large
npm run challenges:large:check   # las mismas comprobaciones para el conjunto grande
```

`build/challenges/answers.json` guarda las respuestas y `build/challenges/manifest.json`, la huella de cada binario. [`public-manifest.json`](public-manifest.json) conserva las huellas de referencia que la CI comprueba en Windows. [`oracle.mjs`](oracle.mjs) decide a partir de las respuestas si una entrada se acepta, sin ejecutar nada, y `verify-answers.mjs` comprueba en Windows que coincide con cada binario.

## Reproducibilidad

Los binarios se compilan con el llvm-mingw de `tools.json`, con `-ffile-prefix-map` y `--no-insert-timestamp`, así que la misma semilla y el mismo compilador dan el mismo SHA-256 en cualquier equipo y en cualquier carpeta. Usan la ABI y la biblioteca de C de mingw, no las de MSVC.

## Conjunto reservado

El banco de pruebas usa también retos generados con una semilla que no se publica y que se guarda fuera del repositorio. La huella de su manifiesto se publica antes de cada estudio y la semilla después, para poder comprobar los resultados sin que los retos se filtren antes en datos de entrenamiento o en prompts.
