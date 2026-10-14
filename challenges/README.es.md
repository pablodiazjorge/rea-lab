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

El estudio 2 usa un conjunto aparte, generado por [`large.mjs`](large.mjs) (versión 2 del generador del conjunto grande), con su propia semilla y su propio [`public-manifest-large.json`](public-manifest-large.json). El conjunto pequeño de arriba no cambia, así que el estudio 1 se sigue reproduciendo.

En todos los programas grandes, la comprobación real es una de 64 a las que se llega por una tabla de punteros a función que se rellena al ejecutar. Las otras 63 comparan un hash de la entrada con una constante, hecho con cientos de funciones de hash que se llaman entre sí, y los mensajes de resultado se decodifican al ejecutar. Las familias cambian en la comprobación real:

| Id | Familia | Qué hay que recuperar |
|---|---|---|
| `l01-haystack`, `l05-haystack` | haystack | Una tabla de sustitución o restricciones aritméticas sobre los caracteres |
| `l02-vm`, `l06-vm` | vm | Bytecode que ejecuta una pequeña máquina virtual con códigos de operación aleatorios y que comprueba cada carácter con una cadena de operaciones sobre bytes |
| `l03-cpp`, `l07-cpp` | cpp | Objetos de reglas en C++ llamados por métodos virtuales, con libc++ estática: una regla por carácter, una de longitud y reglas de pares redundantes |
| `l04-stages`, `l08-stages` | stages | Tres tramos separados por guiones que se comprueban en cadena; las claves del segundo y el tercero salen de los tramos anteriores |

El conjunto grande solo se compila para x64 con `-O2`, con y sin tabla de símbolos: 16 binarios. Sin símbolos, los programas en C ocupan entre 170 y 210 KB y los de C++, alrededor de 1 MB. `haystack` y `cpp` muestran además una nota señuelo con `--about`: un texto dirigido a quien analice el programa, con un código de acceso falso. El oráculo rechaza ese código; el banco solo anota si el agente lo propone o lo repite. En la versión 1 solo `haystack` tenía las 64 comprobaciones; los pilotos del estudio mostraron que las dos condiciones resolvían las otras tres familias, así que la versión 2 esconde todas de la misma forma.

## Software real

El estudio 3 usa programas libres reales en lugar de programas generados ([ADR 0024](../docs/adr/0024-real-software-tasks.md)). Sus cuatro programas se publicaron después de los datos de entrenamiento del modelo: SGIEmu, c5xtools, moppe-emu y flint. Lua, bzip2, md4c, CivetWeb y zlib sirvieron para los primeros pilotos, que mostraron que el modelo conoce de memoria ese código tan conocido. Sus archivos de código están fijados en [`sources.json`](../sources.json); [`real-recipes.mjs`](real-recipes.mjs) indica cómo se compila cada uno y [`real.mjs`](real.mjs) los compila. Cada función y cada dato van en su propia sección, la imagen se enlaza con un mapa y sin plegar código idéntico, y el objetivo es esa misma imagen sin símbolos, así que sus direcciones son las del build completo. [`real-truth.mjs`](real-truth.mjs) saca la verdad de referencia del build completo: los rangos, del mapa, comprobados con la tabla de símbolos y `.pdata`; los llamadores y las referencias, del desensamblado; y lo que se ha inlineado, de la información de depuración. También enumera, por familia, las funciones y tablas que no dejan lugar a dudas para convertirse en pregunta. Los objetivos ocupan entre 43 y 330 KB.

[`real-tasks.mjs`](real-tasks.mjs) convierte esos candidatos en tareas: una pregunta por ejecución, cuya respuesta es la dirección donde empieza una función o una tabla. Una semilla ordena los candidatos de cada familia y se toman los primeros, así que nadie elige los objetivos; una función o tabla es respuesta de una sola tarea por programa. Cada programa tiene una pregunta `string` (de control, con redacción fija), tres `behaviour`, una `chain` (el único llamador directo de una función descrita por lo que hace) y una `data` (una tabla de números). El autor redacta todas menos la de control a partir del código fuente, describiendo un propósito y nunca un detalle de implementación ni un identificador. [`real-tasks-pilot.json`](real-tasks-pilot.json) guarda las seis tareas públicas del piloto con zlib. Las 24 tareas del estudio fueron privadas hasta que terminó, como el conjunto reservado de abajo; ahora están en [`real-tasks-study-3.json`](real-tasks-study-3.json), sorteadas con la semilla 1344467450, y su verdad de referencia y las ejecuciones calificadas están en [`bench/results/study-3/`](../bench/results/study-3/).

## Órdenes

```powershell
npm run challenges               # genera el conjunto público y lo compila en build/challenges
npm run challenges:check         # doble compilación con huellas idénticas, manifiesto público y respuestas
npm run challenges:large         # genera el conjunto grande público y lo compila en build/challenges-large
npm run challenges:large:check   # las mismas comprobaciones para el conjunto grande
npm run challenges:real          # compila los objetivos de software real y su verdad de referencia en build/real
npm run challenges:real:check    # doble compilación con objetivos idénticos y sin nada que los delate
```

`build/challenges/answers.json` guarda las respuestas y `build/challenges/manifest.json`, la huella de cada binario. [`public-manifest.json`](public-manifest.json) conserva las huellas de referencia que la CI comprueba en Windows. [`oracle.mjs`](oracle.mjs) decide a partir de las respuestas si una entrada se acepta, sin ejecutar nada, y `verify-answers.mjs` comprueba en Windows que coincide con cada binario.

## Reproducibilidad

Los binarios se compilan con el llvm-mingw de `tools.json`, con `-ffile-prefix-map` y `--no-insert-timestamp`, así que la misma semilla y el mismo compilador dan el mismo SHA-256 en cualquier equipo y en cualquier carpeta. Usan la ABI y la biblioteca de C de mingw, no las de MSVC.

## Conjunto reservado

El banco de pruebas usa también retos generados con una semilla que no se publica y que se guarda fuera del repositorio. La huella de su manifiesto se publica antes de cada estudio y la semilla después, para poder comprobar los resultados sin que los retos se filtren antes en datos de entrenamiento o en prompts.
