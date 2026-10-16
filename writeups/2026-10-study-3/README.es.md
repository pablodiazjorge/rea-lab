# ¿Ayuda rea a localizar código en software real? Un tercer estudio prerregistrado en Windows

<p><a href="README.md">Read in English</a></p>

El [estudio 1](../2026-10-study-1/README.es.md) y el [estudio 2](../2026-10-study-2/README.es.md) le pedían a Claude Code la entrada que acepta un crackme sintético, con y sin el servidor MCP de ingeniería inversa [rea](https://github.com/morluto/rea). rea no cambió nada con crackmes pequeños y se quedó atrás con los grandes, y la mayoría de los fallos fueron una comprobación encontrada que no se podía invertir sin calcular. Los dos writeups dejaron escrito el siguiente paso: preguntas cuya respuesta sea un análisis, sobre software más parecido al real. Este estudio pregunta dónde está una función o una tabla descrita en programas libres reales, compilados aquí sin símbolos, con las respuestas conocidas de antemano y el análisis fijado antes de la primera ejecución.

**Respuesta corta:** no hay diferencia que medir. Con cuatro programas que el modelo no había visto nunca, el agente localizó la función o la tabla pedida en 71 de 72 ejecuciones solo con herramientas de línea de órdenes y en 68 de 72 con rea (McNemar exacto, p = 0,375). Las dos condiciones están en el techo, así que solo se habría visto un efecto grande, y no lo hubo. rea volvió a costar más del doble, y sus 144 citas de evidencia se autenticaron (142 en la primera publicación; véase la corrección).

## Diseño

Todo lo de esta sección quedó fijado en el [prerregistro](../../bench/preregistration-study-3.md), con commit antes de empezar el estudio (`0c9c38d`, 14 de octubre de 2026), tras cuatro pilotos.

- **Agente y modelo.** Claude Code 2.1.296 sin interfaz (`claude -p`), `claude-sonnet-5-5` con esfuerzo medio.
- **Condiciones.**
  - A: las herramientas de línea de órdenes de LLVM (`llvm-readobj`, `llvm-objdump`, `llvm-strings`, `llvm-nm`) y los filtros de texto habituales, sin ningún intérprete, así que el objetivo no se puede ejecutar.
  - B: lo mismo más rea 6.4.0 por MCP, con Ghidra 12.1.4.

  Las dos podían guardar archivos de trabajo en su propia carpeta y leer los archivos donde Claude Code guarda el resultado de una herramienta demasiado grande para devolverlo directamente; en el estudio 2 esas lecturas estaban denegadas.
- **Programas.** Cuatro programas libres en C cuyos repositorios se crearon después de los datos de entrenamiento del modelo, así que no puede conocer su código: SGIEmu (un emulador de SGI Indy con un intérprete de MIPS, un traductor de MIPS a x86-64 y una interfaz Win32), c5xtools (el ensamblador de una cadena de herramientas para el DSP TMS320C5x), moppe-emu (un emulador de radios antiguas de Nokia) y flint (un lenguaje de script con una máquina virtual de código de bytes). Sus archivos de código están fijados por SHA-256 en [`sources.json`](../../sources.json) y se compilan de forma reproducible con llvm-mingw para x64 con `-O2`, estáticos, una sección por función y por dato, sin plegar código idéntico, y después sin símbolos ([ADR 0024](../../docs/adr/0024-real-software-tasks.md)). Los objetivos ocupan de 48 a 329 KB. El objetivo conserva todos los bytes del build completo que no son de depuración, así que el mapa del enlazador del build completo da la verdad de referencia.
- **Tareas.** 24, seis por programa, una pregunta por ejecución, que se responde con la dirección virtual donde empieza una función o una tabla:
  - `string` (una por programa): la única función que hace referencia a una cadena dada. Es de control y queda fuera de la prueba de hipótesis;
  - `behaviour` (tres, cuatro en c5xtools): una función descrita por su propósito, sin referencias directas a cadenas y cuya dirección nunca se toma;
  - `chain` (una): el único llamador directo de una función descrita por su propósito, así que la respuesta lleva dos pasos;
  - `data` (una, ninguna en c5xtools, que no tiene tablas numéricas): una tabla de números, sin punteros, descrita por su propósito.

  Un validador enumera los objetivos que no dejan lugar a dudas en el binario, y una semilla privada los sorteó, así que el autor no eligió ninguno. El autor redactó todas las preguntas menos la de control a partir del código fuente, describiendo un propósito y nunca una constante, un nombre de instrucción, una llamada a biblioteca ni un identificador. La huella SHA-256 del archivo de tareas se publicó antes del estudio; las tareas, la verdad de referencia y la semilla se publican ahora.
- **Ejecuciones.** Tres repeticiones por tarea y condición: 144 ejecuciones, en orden barajado, con un máximo de 30 minutos y 5 USD de coste equivalente cada una.
- **Aislamiento.** Como en los estudios 1 y 2: cada ejecución tuvo su propia configuración de Claude Code vacía, su propia carpeta con solo el objetivo y una política de permisos que denegaba sin preguntar todo lo no permitido.
- **Calificación.** Sin ningún LLM como juez. Una respuesta es correcta si su dirección cae dentro del rango del objetivo en el mapa del build completo; el inicio exacto se informa aparte. En B, cada `evidence_id` citado se vuelve a autenticar con el propio código de rea, y el calificador comprueba si la evidencia citada recoge la dirección respondida.
- **Estadística.** Tasas con intervalos de Wilson al 95 % y una prueba exacta de McNemar sobre los 60 pares sin la familia de control (misma tarea, misma repetición), la comparación confirmatoria. Como prueba de sensibilidad, un par por tarea, contando una tarea como acertada cuando aciertan al menos dos de sus tres ejecuciones.

## Resultados

| | A: línea de órdenes | B: más rea |
|---|---|---|
| Correctas | 71/72 (99 %, de 93 a 100 %) | 68/72 (94 %, de 87 a 98 %) |
| Nombre en el código fuente acertado | 1/72 | 1/72 |
| Respuesta con el formato exacto de rea | 68/72 | 71/72 |
| Ejecuciones con alguna parada del clasificador | 0 | 0 |
| Ejecuciones que llegaron al límite de 30 minutos | 0 | 0 |
| Mediana de tiempo | 27 s | 74 s |
| Mediana de turnos | 10 | 14 |
| Mediana de tokens de entrada | 112.967 | 300.695 |
| Mediana de coste equivalente | 0,08 USD | 0,19 USD |

Todas las respuestas correctas dieron el inicio exacto de su objetivo.

**H1, A frente a B: no se detecta ningún efecto grande.** De los 60 pares sin la familia de control, 5 discrepan: en 4 solo acertó A y en 1 solo B (McNemar exacto, p = 0,375). La prueba de sensibilidad coincide: una tarea la acierta solo A y ninguna solo B (p = 1). Con tan pocas discrepancias solo se habría podido detectar un efecto grande, así que esto no demuestra ni que rea ayude ni que perjudique aquí.

| Familia | A | B |
|---|---|---|
| `string` (control) | 12/12 | 12/12 |
| `behaviour` | 39/39 | 36/39 |
| `chain` | 11/12 | 11/12 |
| `data` | 9/9 | 9/9 |

| Programa | A | B |
|---|---|---|
| SGIEmu | 18/18 | 17/18 |
| c5xtools | 18/18 | 17/18 |
| moppe-emu | 18/18 | 16/18 |
| flint | 17/18 | 18/18 |

Ningún programa decide el resultado: moppe-emu reúne dos de los cuatro pares en los que solo acertó A, los dos de la misma tarea.

**El modelo no conocía estos programas.** Acertó el nombre del objetivo en el código fuente en 1 de 72 ejecuciones en cada condición, frente a la mayoría en los pilotos con zlib, Lua y md4c. Sin esa memoria, las herramientas de línea de órdenes siguieron encontrando la función: el agente guardaba el desensamblado en un archivo y lo leía.

**Cómo fallaron las ejecuciones.** Cinco ejecuciones dieron una dirección fuera del objetivo, siempre dentro de otra función del mismo programa. Tres de los cuatro fallos de B respondieron una función a un paso en el grafo de llamadas: dos veces en moppe-emu, `io_read` en lugar de `pit_read`, la función descrita, a la que solo llama `io_read`; y una vez en una tarea chain de SGIEmu, `emit_insn` en lugar de `emit_cop1`, la respuesta correcta, a la que solo llama `emit_insn`. El cuarto dio `p_and` en lugar de `pp_rel`, otra función del ensamblador de c5xtools. El único fallo de A, en una tarea chain de flint, dio `http_request_native` en lugar de `import_file_native`.

**Cómo se usó rea.** El agente usó rea en todas las ejecuciones de B y siempre empezó con `open_binary`; cerró la sesión en 71 de 72, tras una mediana de 8 llamadas a rea. En 14 ejecuciones volvió a leer un resultado de rea que Claude Code había guardado en un archivo, el acceso que el estudio 2 denegaba (18 en la primera publicación; véase la corrección). Citó 144 registros de evidencia, y los 144 se autenticaron y trataban del objetivo. Dos de ellos, un mismo `evidence_id` real citado dos veces, le llegaron al agente dentro de uno de esos archivos guardados; al principio el calificador solo leía los resultados devueltos directamente y los contó como desconocidos, hasta la corrección de más abajo. rea rechazó 5 llamadas por entradas no válidas en 4 ejecuciones.

**Qué demuestran las citas.** La RQ3 preguntaba si la dirección respondida aparece en la evidencia que cita `answer_address`. Aparece en 38 de las 72 ejecuciones de B, 37 de ellas correctas. En el resto, la evidencia citada respalda el razonamiento, como el código de la función o una referencia cruzada, pero no recoge la dirección. Leer los archivos guardados, tras la corrección de más abajo, no cambió esta cifra.

Las 144 ejecuciones llevaron 149 minutos de máquina (47 en A y 102 en B) y 30,02 USD de coste equivalente, con una suscripción.

## El clasificador de seguridad

No se cortó ninguna respuesta en ninguna de las 144 ejecuciones. En el estudio 1 el clasificador cortó al menos una respuesta en 24 de 60 ejecuciones, y en el estudio 2 en 28 de 48. Aquellos estudios pedían códigos de acceso de crackmes, y el estudio 2 metía en el binario una nota dirigida a las herramientas de IA; este pregunta dónde está el código en programas corrientes.

## Lo que ya mostraron los pilotos

Cuatro pilotos, 52 ejecuciones con tareas públicas que no forman parte del estudio, dieron forma al diseño. En el primero, con zlib, las dos condiciones respondieron todas las tareas, a menudo con una sola búsqueda de un detalle de implementación que daba la pregunta, así que las preguntas pasaron a describir solo un propósito. En el segundo y el tercero, con zlib y después con Lua y md4c, el modelo localizaba funciones de esos proyectos tan conocidos recordando su código, incluso a partir de un propósito, y acertaba la mayoría de los nombres. Eso llevó el estudio a programas publicados después de los datos de entrenamiento del modelo. En el cuarto, con esos programas, A siguió respondiendo 7 de 8, por encima del objetivo del 30 al 70 % fijado antes de los pilotos, y no acertó ningún nombre. El estudio se hizo igualmente con una tercera repetición, y el prerregistro dice que no se alcanzó el objetivo.

## Trabajos relacionados

La tarea publicada más cercana es Binary Function Search, del [informe técnico de ZGCM-1](https://arxiv.org/abs/2609.13356) (He y otros, septiembre de 2026): un agente recibe un binario ELF sin símbolos y la descripción del comportamiento de una función, trabaja con una interfaz respaldada por Ghidra y tiene que dar la dirección exacta de entrada, que comprueba un oráculo construido a partir del binario con símbolos. Sus 50 tareas de evaluación salen de diez proyectos muy conocidos, entre ellos zlib, Lua y XZ Utils, que quedaron fuera del entrenamiento de ese modelo. Este estudio se diferencia en tres cosas: compara el mismo agente con y sin descompilador, sobre binarios PE nativos de Windows; sus programas son posteriores al modelo, después de que los pilotos mostraran que este modelo localiza de memoria funciones de proyectos conocidos; y sus preguntas evitan las constantes, que el primer piloto mostró que las herramientas de línea de órdenes encuentran con una sola búsqueda. El trabajo de Nishizaka y otros [en el taller BAR 2026](https://www.ndss-symposium.org/ndss-paper/auto-draft-657/), citado en el estudio 2, encontró agentes que analizaban bien el ensamblador sin descompilador en retos de CTF; este estudio apunta en la misma dirección con programas reales.

## Qué significa

- Entre los tres estudios, no hay ninguna señal de que rea aumente cuántas tareas resuelve Claude Code con este modelo: ninguna con crackmes pequeños, una diferencia no significativa en contra con los grandes y ninguna aquí, donde las dos condiciones están en el techo. Cada vez cuesta más: alrededor del doble en los estudios 1 y 2, y 2,3 veces la mediana de coste aquí.
- Encontrar una función descrita en un programa pequeño sin símbolos es fácil para este agente con `llvm-objdump` y `grep`, incluso en código que no ha visto nunca: 71 de 72, todas en el inicio exacto. Un banco de pruebas que distinga las condiciones necesita preguntas más difíciles o programas más grandes.
- Con rea, tres de los cuatro fallos se quedaron a un paso en el grafo de llamadas: el agente llegó a la zona correcta y después respondió un llamador. Cuatro fallos son muy pocos para saber por qué.
- La evidencia de rea sigue comprobándose (las 144 aquí, dos de ellas de un resultado de rea guardado en un archivo), pero a menudo una cita respalda el razonamiento sin recoger la respuesta: solo en 38 de 72 ejecuciones la evidencia citada contenía la dirección respondida.
- Las paradas del clasificador de seguridad de los estudios 1 y 2 iban con las tareas de crackmes, no con la ingeniería inversa en sí.
- Las siguientes preguntas son programas más grandes, builds de MSVC y C++, respuestas que sean análisis más allá de una ubicación (la disposición de una estructura, un protocolo, un comportamiento que cambia entre versiones) y otros agentes y modelos.

## Desviaciones

El equipo que ejecutaba el estudio se reinició una vez, después de 14 ejecuciones, y cortó la ejecución 15 (`r04` con rea, segunda repetición) antes de terminar; no había producido resultado. El estudio se reanudó con la misma orden y desde el mismo commit: el arnés saltó las ejecuciones terminadas y repitió desde el principio la cortada. Su carpeta a medias se conserva. No hubo ninguna otra desviación en cómo se ejecutó el estudio; la corrección del calificador del 16 de octubre de 2026 se explica aparte, más abajo.

## Corrección (16 de octubre de 2026)

Cuando el resultado de una herramienta es demasiado grande para devolverlo directamente, Claude Code 2.1.296 lo sustituye por un aviso, sin marca de error, y escribe el resultado completo en un archivo que el agente puede leer. El calificador solo autenticaba la evidencia devuelta directamente, así que los 43 resultados de rea guardados así contaban como no descodificables, y dos citas de uno de ellos como desconocidas. Ahora el calificador lee esos archivos en los conjuntos de software real, y empareja cada archivo con su llamada mediante el aviso de esa misma llamada ([ADR 0019](../../docs/adr/0019-reuse-rea-evaluation.md)); los conjuntos anteriores siguen con la entrega directa, así que los estudios 1 y 2 se califican igual. Las 144 ejecuciones se volvieron a calificar desde sus transcripciones guardadas:

| Medida, condición B | En la primera publicación | Tras la corrección |
|---|---|---|
| Citas autenticadas y sobre el objetivo | 142 de 144 | 144 de 144 |
| Identificadores inventados | 2 | 0 |
| Registros de evidencia entregados | 632 | 675 |
| Dirección respondida en la evidencia citada | 38 de 72 | 38 de 72 |

No cambió nada más: ninguna respuesta, inicio exacto, prueba de McNemar ni métrica de uso de herramientas. El informe y las ejecuciones calificadas de `bench/results/study-3/` se regeneraron; la primera versión publicada está en el historial del repositorio.

Una segunda corrección, encontrada al revisar el [estudio 4](../2026-10-study-4/README.es.md): este writeup decía que el agente volvió a leer un resultado de rea guardado en 18 ejecuciones. Esa cifra contaba todas las ejecuciones que llamaron a una herramienta sobre un resultado guardado. En 3 de ellas se denegaron todas esas llamadas, todas órdenes `jq` encadenadas tras un `cd`, y en 1 el agente leyó la salida guardada de una orden, no un resultado de rea. Volvió a leer un resultado de rea guardado en 14 ejecuciones. `context.ts` calcula ahora las dos cifras, y [`context.json`](../../bench/results/study-3/context.json) se regeneró con ellas (`readAttemptRuns` 18, `readBackRuns` 14); no cambió nada más.

## Anexo: resultados grandes y coste del catálogo (a posteriori)

Estas medidas no estaban prerregistradas. Son exploratorias y salen de las transcripciones guardadas, que no se publican ([ADR 0014](../../docs/adr/0014-publishing-evidence.md)). Las calcula `node bench/context.ts --study study-3`, y su salida está en [`bench/results/study-3/context.json`](../../bench/results/study-3/context.json).

- **Resultados grandes.** Claude Code guardó en un archivo al menos un resultado de rea en 32 de las 72 ejecuciones de B, 43 resultados en total. El agente volvió a leer un resultado de rea guardado en 14 de esas ejecuciones; lo intentó en 18.

  | Herramienta | Llamadas | Guardadas en un archivo | Tamaño de esos resultados |
  |---|---|---|---|
  | `list_procedures` | 21 | 21 | De 51 a 224 KB, mediana de 52 KB |
  | `procedure_pseudo_code` | 306 | 18 | De 58 a 471 KB, mediana de 194 KB |
  | `search_procedures` | 16 | 2 | 52 y 108 KB |
  | `list_strings` | 1 | 1 | 60 KB |
  | `procedure_references` | 1 | 1 | 95 KB |
  | `search_strings` | 101 | 0 | |

- **Rutas paginadas.** Ninguna ejecución llamó a `analyze_function` ni a `inspect_analysis_view`, que paginan el código de una función grande.
- **Coste del catálogo.** rea 6.4.0 anunciaba 153 herramientas. Claude Code las listó solo por su nombre y cargó los esquemas con su búsqueda de herramientas, que usaron todas las ejecuciones de B, con una mediana de una vez. La primera petición de cada ejecución llevó una mediana de 12.189 tokens de entrada en B frente a 8.972 en A, unos 3.200 más. Ese coste se repite en cada petición: multiplicado por las peticiones de cada ejecución, es una mediana del 12 % de los tokens de entrada (del 3 % al 19 %). Los tokens de entrada suman entrada, creación de caché y lecturas de caché de cada petición, y dan las medianas del informe (300.695 en B y 112.967 en A).

## Limitaciones

- No se alcanzó el objetivo de calibración: A acertó el 99 %, así que la mayoría de los pares coinciden y solo se podría ver un efecto grande.
- Cuatro programas pequeños en C, de 48 a 329 KB, compilados con llvm-mingw, no con MSVC. Los proyectos nuevos son pequeños y recientes, y buena parte de su código parece escrito con ayuda de IA, así que puede ser más convencional que el software más antiguo.
- Cuatro programas son cuatro grupos: las tareas de un mismo programa comparten binario.
- El autor redactó las preguntas; la semilla eligió los objetivos, pero la forma de describir un propósito puede hacer una tarea más fácil o más difícil.
- Un solo agente y un solo modelo; nada de esto habla todavía por otros agentes.
- Ninguna de las dos condiciones podía ejecutar un intérprete, a propósito.
- El coste es el coste equivalente de Claude Code, no dinero gastado: las ejecuciones usaron una suscripción.
- rea 6.4.0, la versión de los estudios 1 y 2, congelada para poder comparar.
- Hasta la corrección de más arriba, el calificador solo autenticaba la evidencia devuelta directamente y no leía los archivos donde Claude Code guarda los resultados grandes, que este estudio permitió por primera vez.
- La heurística de revisión marcó 28 ejecuciones (19 en A y 9 en B) por intentos de ejecutar Python o por rutas fuera de la carpeta de la ejecución. La política de permisos denegó todas las llamadas a intérpretes. Los comandos que sí se ejecutaron eran falsos positivos, como un `grep` de la palabra `python` entre las cadenas del programa, y las rutas de fuera o estaban denegadas o eran patrones de `sed` y `awk` leídos como unidades de disco. No se excluyó ninguna ejecución.

## Cómo reproducirlo

La semilla del sorteo de objetivos es **1344467450**. Volver a sortear con `node challenges/real-tasks.mjs draw --role study --seed 1344467450` da los mismos 24 objetivos; las preguntas son las del autor, en [`challenges/real-tasks-study-3.json`](../../challenges/real-tasks-study-3.json), cuya huella SHA-256 es `ae8175807a521028d82984b668ab49bf3e4a42f7a28ddd6dae09af8c2bcd21aa`, la misma que se publicó antes del estudio. La huella SHA-256 del manifiesto del build es `996a69f7b215aca561936617a206000226a4a723d89059b47f62ef895b3789eb`.

```powershell
npm ci
npm run setup
node scripts/setup.mjs --manifest sources.json
node challenges/real.mjs --out <carpeta>
node challenges/real-tasks.mjs resolve challenges/real-tasks-study-3.json --build <carpeta>
node bench/run.ts --study study-3 --model claude-sonnet-5-5 --effort medium --set <carpeta> --conditions A,B --repetitions 3 --order-seed 20261017 --timeout-min 30 --max-budget-usd 5
node bench/report.ts --study study-3
```

Las ejecuciones calificadas y la verdad de referencia de las 24 tareas (el nombre y el rango de cada objetivo) están publicadas en [`bench/results/study-3/`](../../bench/results/study-3/), y el informe se regenera a partir de ellas con una sola orden:

```powershell
node bench/report.ts --results bench/results/study-3/results.jsonl --out <carpeta>
```

Cómo funciona el banco de pruebas, su aislamiento y su calificación se explica en [`bench/`](../../bench/README.es.md).
