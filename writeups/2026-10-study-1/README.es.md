# ¿Qué le aporta rea a un agente de programación? Un estudio prerregistrado con binarios de Windows

<p><a href="README.md">Read in English</a></p>

[rea](https://github.com/morluto/rea) da a los agentes de programación herramientas MCP de ingeniería inversa, con Ghidra por debajo y registros de evidencia (Evidence) que cualquiera puede volver a autenticar. La pregunta obvia ante una herramienta así es sencilla: ¿qué aporta frente a dejar que el agente use las herramientas de línea de órdenes de siempre? Este estudio mide justo eso con binarios nativos de Windows, con las respuestas conocidas de antemano y el análisis fijado antes de la primera ejecución.

**Respuesta corta:** con diez crackmes pequeños, rea no cambió cuántos resolvió el agente (28 de 30 con y sin rea). Hizo cada ejecución el doble de lenta y de cara, hizo que el clasificador de seguridad del modelo cortara respuestas mucho más a menudo, y toda la evidencia que el agente citó de rea era auténtica.

## Diseño

Todo lo de esta sección quedó fijado en el [prerregistro](../../bench/preregistration-study-1.md), con commit antes de empezar el estudio (`d29c85b`, 12 de octubre de 2026). No hubo ninguna desviación.

- **Agente y modelo.** Claude Code 2.1.296 sin interfaz (`claude -p`), `claude-sonnet-5-5` con esfuerzo medio.
- **Condiciones.**
  - A: las herramientas de línea de órdenes de LLVM (`llvm-readobj`, `llvm-objdump`, `llvm-strings`, `llvm-nm`) y los filtros de texto habituales, sin ningún intérprete, así que el objetivo no se puede ejecutar.
  - B: lo mismo más rea 6.4.0 por MCP, con Ghidra 12.1.4.
  - C: B más la skill de rea.
- **Retos.** Diez programas pequeños en C del [generador con semilla](../../challenges/README.es.md) del laboratorio, compilados de forma reproducible con llvm-mingw, sin símbolos y con `-O2`. Cada uno lee una línea y escribe `ACCESS GRANTED` o `ACCESS DENIED`. Cubren ocho familias (comparación directa, XOR, suma de comprobación ponderada, switch con tabla, máquina de estados, restricciones aritméticas, tabla de sustitución y comprobaciones repartidas en punteros a función), con `checksum` y `state` también en una compilación de 32 bits. La semilla se ha mantenido en privado hasta ahora; la huella SHA-256 de su manifiesto se publicó antes del estudio.
- **Ejecuciones.** Tres repeticiones por reto en A y en B, y una en C: 70 ejecuciones, en orden barajado.
- **Aislamiento.** Cada ejecución tuvo su propia configuración de Claude Code vacía, su propia carpeta con solo el objetivo y una política de permisos que denegaba sin preguntar todo lo no permitido. El registro de arranque de Claude Code demuestra, ejecución por ejecución, que no se coló ningún plugin, skill ni servidor MCP.
- **Calificación.** Sin ningún LLM como juez. Un oráculo, contrastado con cada binario real, decide si la entrada propuesta se acepta. En B y C, cada `evidence_id` citado se vuelve a autenticar con el propio código de rea y tiene que tratar del objetivo.
- **Estadística.** Tasas de resolución con intervalos de Wilson al 95 % y una prueba exacta de McNemar sobre ejecuciones emparejadas (mismo reto, misma repetición) para A frente a B, la comparación confirmatoria.

## Resultados

| | A: línea de órdenes | B: más rea | C: más la skill de rea |
|---|---|---|---|
| Resueltos | 28/30 (93 %, de 79 a 98 %) | 28/30 (93 %, de 79 a 98 %) | 9/10 (90 %, de 60 a 98 %) |
| Mecanismo identificado | 29/30 | 27/30 | 9/10 |
| Respuesta con el formato exacto de rea | 25/30 | 28/30 | 9/10 |
| Ejecuciones con alguna parada del clasificador | 7/30 | 17/30 | 6/10 |
| Ejecuciones que acabaron sin respuesta | 1 | 0 | 0 |
| Mediana de tiempo | 23 s | 54 s | 55 s |
| Mediana de turnos | 5 | 11 | 10 |
| Mediana de tokens de entrada | 85.023 | 271.514 | 325.003 |
| Mediana de coste equivalente | 0,10 USD | 0,25 USD | 0,28 USD |

**H1, A frente a B: no se detecta ningún efecto grande.** De los 30 pares, solo dos discrepan, uno en cada sentido (McNemar exacto, p = 1). La prueba de sensibilidad prerregistrada, con un par por reto, no encuentra ninguna discrepancia. Con 30 pares solo se pueden detectar efectos grandes, así que esto no demuestra que rea no tenga efecto: demuestra que, con retos como estos, no cambia mucho el resultado en ningún sentido.

| Familia | A | B | C |
|---|---|---|---|
| compare, xor, checksum, state, pairs, sbox, indirect | 25/25 | 25/25 | 8/8 |
| table | 1/3 | 1/3 | 0/1 |

Todos los fallos están en una sola familia, `table`, cuyos caracteres salen de un switch sobre su posición.

**Cómo se usó rea.** En B y C, el agente usó rea en todas las ejecuciones y siempre empezó con `open_binary`; cerró la sesión en 38 de 40. Citó 80 registros de evidencia, y los 80 se volvieron a autenticar y trataban del objetivo: ni un solo `evidence_id` inventado. En cambio, rea rechazó 22 llamadas por entradas no válidas (19 en B y 3 en C), sobre todo argumentos con un nombre natural pero equivocado: `address` donde `procedure_pseudo_code` espera `procedure` (13 llamadas) y `query` donde `search_strings` espera `pattern` (4). La skill que se ofrecía en C no se cargó nunca.

Las 70 ejecuciones llevaron 58 minutos de máquina y 15,52 USD de coste equivalente.

## El clasificador de seguridad

El clasificador de seguridad del modelo cortó al menos una respuesta en 17 de las 30 ejecuciones con rea, frente a 7 de 30 sin rea. Claude Code avisa entonces al modelo de que su respuesta se cortó y le deja continuar una vez. Casi siempre, el agente siguió y respondió.

Los fallos de `table` con rea siguen un patrón. Las tres ejecuciones fallidas tuvieron dos paradas del clasificador cada una, y las tres respondieron lo mismo: la longitud correcta, formada por el primer carácter repetido (`ppppppppppppppp` para `pebble-fjord-86`). La única ejecución de `table` con rea que no tuvo paradas lo resolvió. Nuestra lectura, que tres casos no pueden demostrar: la parada se llevó la respuesta que estaba descifrando la tabla y el agente rellenó con lo que le quedaba. Sin rea, una ejecución de `table` acabó sin respuesta tras una parada y otra intercambió las letras de una palabra (`pebble-ojfrd-86`).

## Lo que ya mostraron los pilotos

Cuatro pilotos con los retos públicos (35 ejecuciones, que no forman parte del estudio) dieron forma al diseño. Un compilador que optimiza pliega las búsquedas en tablas constantes en comparaciones directas, así que las compilaciones `-O2` de algunas familias regalaban la respuesta hasta que sus tablas pasaron a ser modificables. Un `awk` denegado hizo que un agente se detuviera en lugar de analizar, así que se permitieron los filtros de texto habituales. Y la skill no se cargó nunca, por eso C tuvo una sola repetición. Los detalles están en el prerregistro.

## Qué significa

- Para crackmes estáticos pequeños, un modelo potente con un desensamblador ya funciona muy bien. El descompilador y las vistas estructuradas de rea no subieron aquí la tasa de resolución, y cuestan tiempo y tokens.
- Lo que sí añadió rea es evidencia comprobable: cada afirmación que el agente respaldó con rea apuntaba a un registro real, autenticado de nuevo y sobre el binario correcto.
- El clasificador corta mucho más cuando el agente lee comprobaciones de contraseña descompiladas a través de rea. En estas tareas costó sobre todo tiempo, pero también explica la mayoría de los fallos con rea.
- Estos retos son mucho más sencillos que el software real. La pregunta interesante, donde la estructura de rea debería pesar más, son los binarios grandes: es el siguiente estudio natural.

## Limitaciones

- Diez programas pequeños en C compilados con llvm-mingw, mucho más sencillos que el software real, y no con MSVC.
- Un solo agente y un solo modelo; nada de esto habla todavía por otros agentes.
- 30 pares solo detectan efectos grandes.
- El coste es la estimación del propio Claude Code a precios de lista, no dinero gastado.
- rea 6.4.0, congelado antes de que se publicara la 6.5.0.
- La heurística de revisión que marca las órdenes que intentan ejecutar un programa detectó 23 intentos de usar Python o de escribir fuera de la carpeta de la ejecución. La política de permisos los denegó todos y ninguno llegó a ejecutarse; no se excluyó ninguna ejecución.
- Añadido el 16 de octubre de 2026: las ejecuciones se lanzaron desde la app de escritorio de Claude, cuyo entorno fija dos ajustes de Claude Code: `DISABLE_MICROCOMPACT=1`, que desactiva la limpieza de los resultados viejos de herramientas del contexto, y `API_TIMEOUT_MS=900000`. El arnés no los filtraba, así que con toda probabilidad llegaron a todas las ejecuciones. Se aplicaron a todas las condiciones por igual, así que ninguna comparación cambia, pero las cifras absolutas de tokens y de coste pueden ser más altas que con los valores por defecto de Claude Code. Desde el estudio 5 el arnés los descarta ([ADR 0018](../../docs/adr/0018-benchmark-isolation.md)).

## Cómo reproducirlo

La semilla del conjunto reservado es **1501550637** (versión 3 del generador); la huella SHA-256 de su `manifest.json` es `40bd49f3da9790303312ae9fb026f19b67e54bc206cf73982fa764ea47d8fdda`, la misma que se publicó antes del estudio.

```powershell
npm ci
npm run setup
node challenges/build.mjs --seed 1501550637 --out <carpeta>
node bench/run.ts --study study-1 --model claude-sonnet-5-5 --effort medium --set <carpeta> --order-seed 20261012 --repetitions A=3,B=3,C=1 --cells c01-compare:x64-O2-strip,c02-xor:x64-O2-strip,c03-checksum:x64-O2-strip,c04-table:x64-O2-strip,c05-state:x64-O2-strip,c06-pairs:x64-O2-strip,c07-sbox:x64-O2-strip,c08-indirect:x64-O2-strip,c03-checksum:x86-O2-strip,c05-state:x86-O2-strip
node bench/report.ts --study study-1
```

Las ejecuciones calificadas están publicadas en [`bench/results/study-1/`](../../bench/results/study-1/), y el informe se regenera a partir de ellas con una sola orden:

```powershell
node bench/report.ts --results bench/results/study-1/results.jsonl --out <carpeta>
```

Cómo funciona el banco de pruebas, su aislamiento y su calificación se explica en [`bench/`](../../bench/README.es.md).
