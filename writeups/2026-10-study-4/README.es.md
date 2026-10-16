# ¿Se mantiene el resultado del estudio 3 con otro modelo? Un cuarto estudio prerregistrado en Windows

<p><a href="README.md">Read in English</a></p>

El [estudio 3](../2026-10-study-3/README.es.md) le preguntaba a Claude Code dónde está una función o una tabla descrita en cuatro programas libres reales, compilados aquí sin símbolos, con y sin el servidor MCP de ingeniería inversa [rea](https://github.com/morluto/rea). Con `claude-sonnet-5-5`, las dos condiciones estaban en el techo y no había diferencia que medir. Este estudio lo repite con un modelo de otra familia, `deepseek-flash` de DeepSeek, servido por la API de DeepSeek compatible con la de Anthropic: el mismo cliente, el mismo arnés, las mismas tareas y los mismos límites, con una repetición por tarea porque el presupuesto era el saldo que le quedaba al autor en DeepSeek. Prueba un segundo modelo, no un segundo agente.

**Respuesta corta:** el mismo techo. El agente localizó la función o la tabla pedida en 20 de 20 ejecuciones solo con herramientas de línea de órdenes y en 19 de 20 con rea (McNemar exacto, p = 1). Con 20 pares solo se habría visto un efecto muy grande, y no lo hubo. Con las mismas 20 tareas, el estudio 3 tuvo 59 de 60 y 56 de 60. Las 40 ejecuciones costaron 2,05 USD de dinero real. A diferencia de Claude, el modelo de DeepSeek intentó salir a internet o entrar en carpetas del banco de pruebas fuera de su ejecución en 13 de las 40, varias veces para encontrar el código fuente de los programas; la política de permisos denegó todos los intentos.

## Diseño

Todo lo de esta sección quedó fijado en el [prerregistro](../../bench/preregistration-study-4.md), con commit antes de empezar el estudio (`b4227d5`, 16 de octubre de 2026), después de un piloto.

- **Qué cambió respecto al estudio 3.**
  - Modelo: `deepseek-flash` (DeepSeek-V4.1-Flash), servido por la API de DeepSeek compatible con la de Anthropic (`--provider deepseek`). Cada ejecución registra el modelo que sirvió la API; fue `deepseek-flash` en las 40.
  - Búsqueda de herramientas forzada. Claude Code la apaga con una URL base que no es la de Anthropic, y entonces cada petición lleva los 153 esquemas de herramientas de rea: 127.161 tokens de entrada en la primera petición con rea, frente a 7.903 con la búsqueda activada. Forzarla mantiene diferidos los esquemas de rea, como en el estudio 3 ([ADR 0018](../../docs/adr/0018-benchmark-isolation.md)).
  - Tareas: las 20 tareas del estudio 3 fuera de la familia de control `string`, cinco por programa.
  - Ejecuciones: una repetición por tarea y condición, 40 ejecuciones, en orden barajado.
  - Coste: calculado con el uso de tokens de cada ejecución y los precios publicados por DeepSeek, que bajan a la mitad fuera de la hora pico ([ADR 0020](../../docs/adr/0020-cost-sources.md)). Las 40 ejecuciones empezaron fuera de la hora pico, entre las 12:30 y las 16:39 UTC del viernes 16 de octubre.
- **Qué se mantuvo.** Claude Code 2.1.296 en modo sin interfaz y con esfuerzo medio; la condición A con las herramientas de línea de órdenes de LLVM y filtros de texto, sin intérprete, y la condición B con lo mismo más rea 6.4.0 por MCP con Ghidra 12.1.4; los cuatro programas, su build, las preguntas y la verdad de referencia del estudio 3; 30 minutos por ejecución; el mismo aislamiento y la misma calificación.
- **Estadística.** Tasas con intervalos de Wilson al 95 % y una prueba de McNemar exacta sobre los 20 pares. Con tan pocos pares el estudio es exploratorio: un resultado no significativo se lee como «no se detecta ningún efecto grande».

## Resultados

| | A: herramientas de línea de órdenes | B: más rea |
|---|---|---|
| Correctas | 20/20 (100 %, de 84 a 100 %) | 19/20 (95 %, de 76 a 99 %) |
| Nombre en el código fuente acertado | 3/20 | 2/20 |
| Respuesta con el formato exacto del manifiesto de rea | 14/20 | 20/20 |
| Ejecuciones que llegaron al límite de 30 minutos | 0 | 0 |
| Tiempo mediano | 272 s | 332 s |
| Turnos (mediana) | 37,5 | 54 |
| Tokens de entrada (mediana) | 1.393.104 | 2.008.207 |
| Tokens de salida (mediana) | 42.514 | 43.448 |
| Coste mediano | 0,04 USD | 0,05 USD |

Todas las respuestas correctas dieron el inicio exacto de su objetivo.

**H1, A frente a B: no se detecta ningún efecto grande.** Discrepa un par de 20, en el que solo acertó A (McNemar exacto, p = 1).

| Familia | A | B |
|---|---|---|
| `behaviour` | 13/13 | 12/13 |
| `chain` | 4/4 | 4/4 |
| `data` | 3/3 | 3/3 |

Todos los programas tuvieron 5 de 5 en las dos condiciones, salvo moppe-emu con rea, con 4 de 5.

**Frente al estudio 3, tarea por tarea.** Los dos modelos respondieron casi todo. Los fallos caen en tareas distintas: DeepSeek con rea acertó las tres tareas en las que Claude con rea había fallado, y falló una que Claude acertó seis de seis veces. Son ejecuciones sueltas, así que como mucho es una pista. La tabla completa está en el [informe](../../bench/results/study-4/report.md).

| Tarea | Familia | Programa | A | B | A en el estudio 3 | B en el estudio 3 |
|---|---|---|---|---|---|---|
| r05 | `chain` | SGIEmu | 1/1 | 1/1 | 3/3 | 2/3 |
| r10 | `behaviour` | c5xtools | 1/1 | 1/1 | 3/3 | 2/3 |
| r14 | `behaviour` | moppe-emu | 1/1 | 0/1 | 3/3 | 3/3 |
| r15 | `behaviour` | moppe-emu | 1/1 | 1/1 | 3/3 | 1/3 |
| r23 | `chain` | flint | 1/1 | 1/1 | 2/3 | 3/3 |
| Las 20 tareas | | | 20/20 | 19/20 | 59/60 | 56/60 |

**Cómo falló la ejecución.** El único fallo, r14 con rea, pedía la función que sigue el bus serie de dos hilos de la radio. Tras 72 turnos y 935 s, el agente respondió `cu53an_out2`, una función de otro chip de la radio, en lugar de `bus_edge`. No es vecina del objetivo en el grafo de llamadas: comparte sus dos llamadores con `cu58af_set_scl`, que es la función que llama a `bus_edge`.

**Nombres en el código fuente.** El agente acertó el nombre del objetivo en 5 de 40 ejecuciones, frente a 2 de 120 de Claude con las mismas tareas: `pit_read` y `pio_set_input` en las dos condiciones, y `k` para la tabla de constantes de ronda de SHA-256, en A. Las dos primeras son las mismas tareas cuyos nombres acertó Claude en el estudio 3, y los tres nombres se deducen de cómo está redactada la pregunta, así que apuntan a las preguntas, no a la memoria del código.

**El agente buscó el código fuente.** El prerregistro lo convirtió en un resultado medido después del piloto, donde apareció por primera vez. Se denegaron todos los intentos, así que no hubo que excluir ninguna ejecución.

- 7 ejecuciones (5 en A y 2 en B) usaron `curl`:
  - cuatro comprobaron si había red, tres contra `raw.githubusercontent.com` y una contra `example.com`;
  - dos pidieron el README de flint, en la URL del repositorio que lleva dentro el propio binario de flint;
  - una buscó en los repositorios de GitHub `r58emu`, un nombre que había encontrado entre las cadenas de moppe-emu.
- 6 ejecuciones (1 en A y 5 en B) intentaron listar las carpetas del banco de pruebas por encima de la suya, «para buscar metadatos» según las descripciones del propio agente, y en una ejecución para encontrar los archivos donde Claude Code guarda los resultados grandes. En ese árbol de carpetas está también el build del estudio 3 del banco, con su verdad de referencia, así que las respuestas estaban a un listado denegado de distancia.

Ninguna de las 144 ejecuciones del estudio 3 intentó salir a la red, y en el piloto este modelo lo hizo en 2 de 8.

**Cómo se usó rea.** El agente usó rea en las 20 ejecuciones de B, siempre empezó con `open_binary` y siempre cerró la sesión, tras una mediana de 20,5 llamadas a rea, frente a 8 con Claude. Llamó a 27 herramientas distintas de rea, frente a 17 con Claude, entre ellas `analyze_function`, que pagina el código de una función grande: 17 llamadas en 13 ejecuciones, que Claude no hizo nunca. Los 40 `evidence_id` citados se autenticaron y trataban del objetivo. En 18 de las 20 ejecuciones la evidencia citada recoge la dirección respondida, frente a 38 de 72 con Claude. rea rechazó 2 llamadas por entradas no válidas.

**Resultados guardados.** Claude Code guardó en un archivo 47 resultados de rea en 19 de las 20 ejecuciones de B, de 51 KB a 2,3 MB, y el agente volvió a leer alguno en 16 ejecuciones, con las herramientas Read y Grep de Claude Code y filtros de texto de la consola; se denegaron sus intentos de procesarlos con Python. Con DeepSeek, Claude Code usó dos formas del aviso que sustituye a un resultado guardado: para los 29 más grandes, de 60 KB a 2,3 MB, el aviso de error del estudio 3, con el archivo nombrado según la herramienta y sin vista previa; para 18 resultados de 51 a 67 KB, un aviso con el archivo nombrado con el identificador de la llamada y una vista previa de 2 KB. Los 43 resultados guardados del estudio 3 tenían la primera forma. El calificador sigue las dos hasta el archivo ([ADR 0019](../../docs/adr/0019-reuse-rea-evaluation.md)).

**Formato de la respuesta.** En 6 de las 20 ejecuciones de A el mensaje final tenía texto alrededor del manifiesto JSON, así que no pasó la comprobación estricta; el calificador leyó igualmente la respuesta, como en los estudios anteriores. Con rea, las 20 fueron exactas.

**Coste y tiempo.** Las 40 ejecuciones llevaron 254 minutos de máquina y costaron 2,05 USD (0,95 en A y 1,11 en B), frente a los 3 o 4 USD que esperaba el prerregistro a partir del piloto. Casi todo son tokens de salida: una mediana de unos 43.000 por ejecución, sobre todo razonamiento, frente a 1.622 y 1.805 con Claude en el estudio 3. Las ejecuciones tardaron unas diez veces más que con Claude en A y cuatro veces y media más en B. La estimación del propio Claude Code, con precios de Claude, fue de 115,19 USD; por eso el arnés calcula él mismo el precio de los tokens de DeepSeek. Los costes de los dos estudios no son comparables: el estudio 3 da el coste equivalente de Claude Code con una suscripción, y este, dinero gastado.

Ningún clasificador de seguridad detuvo ninguna respuesta. El clasificador que detuvo respuestas en los estudios 1 y 2 es de la API de Anthropic, que este estudio no usó.

## Lo que ya mostró el piloto

Un piloto de 8 ejecuciones con cuatro tareas públicas, ninguna del estudio, dio forma al diseño ([prerregistro](../../bench/preregistration-study-4.md#pilot-before-freezing)). Mostró que Claude Code apaga la búsqueda de herramientas con la API de DeepSeek, que los tokens de salida dominan el coste y que este modelo intenta conseguir el código fuente: listados de las carpetas de repositorios del autor en una ejecución y `curl` a la API de GitHub en dos. A respondió 3 de 4 y B 4 de 4.

## Qué significa

- Con una segunda familia de modelos, el resultado del estudio 3 se mantiene: las dos condiciones localizan la función descrita casi siempre, y rea no marca ninguna diferencia que 20 pares puedan detectar. El techo no es una propiedad de `claude-sonnet-5-5`. Sigue siendo un solo cliente, Claude Code, así que nada de esto vale todavía para otros agentes.
- rea volvió a tardar más y a costar algo más (mediana de 332 s frente a 272 s, y de 0,05 frente a 0,04 USD), pero la diferencia es mucho menor que las 2,3 veces del coste mediano con Claude, porque los tokens de razonamiento de este modelo dominan en las dos condiciones.
- Los dos modelos usan rea de forma distinta. El de DeepSeek hizo más llamadas, con más herramientas distintas, incluida la ruta paginada que Claude no usó nunca, y la evidencia que citó recogía la respuesta más a menudo.
- El aislamiento importa más con algunos modelos. El de DeepSeek intentó salir a la red o al equipo en 13 de 40 ejecuciones, y la verdad de referencia del propio banco de pruebas estaba unas carpetas por encima de las ejecuciones. La política de permisos aguantó, pero el próximo estudio debería guardar la verdad de referencia fuera del árbol de carpetas donde viven las ejecuciones.
- Una réplica de 40 ejecuciones costó 2 USD, así que repetir un estudio con modelos más baratos es asequible.

## Desviaciones

Ninguna en cómo se ejecutó el estudio: la orden prerregistrada, desde `b4227d5`, sin fallos de infraestructura, sin repeticiones y sin interrupciones. Después del estudio se cambió el generador del informe para que diga que el coste de DeepSeek es dinero gastado y para añadir la comparación por tarea con el estudio 3 que prometía el análisis; el análisis no cambió. `context.ts` cuenta ahora también los resultados de rea que Claude Code guarda con DeepSeek con el identificador de la llamada, y las ejecuciones que vuelven a leer un resultado guardado.

Al revisar las relecturas de este estudio apareció un error en el anexo del estudio 3: decía que el agente volvió a leer un resultado guardado en 18 ejecuciones, contando todos los intentos. Leyó un resultado de rea guardado en 14; la [corrección](../2026-10-study-3/README.es.md#corrección-16-de-octubre-de-2026) del estudio 3 tiene los detalles.

## Limitaciones

- 20 pares y una repetición por tarea: solo se habría visto un efecto muy grande, y el resultado de cada tarea es una sola ejecución.
- Un segundo modelo, no un segundo agente: el cliente, los prompts y las herramientas eran los de Claude Code.
- La fecha de corte del entrenamiento del modelo no está publicada. Salió en septiembre de 2026 y los programas se publicaron en septiembre y octubre de 2026, así que es poco probable que recuerde su código; el resultado del nombre en el código fuente no encontró indicios de ello más allá de lo que delatan las preguntas.
- La API de DeepSeek no aplica el nivel de esfuerzo de Claude Code como presupuesto de razonamiento, así que el esfuerzo se fijó y no se comparó.
- La búsqueda de herramientas se forzó, y no es lo que hace Claude Code por defecto con API de terceros; sin ella, cada petición con rea llevaría unos 120.000 tokens de entrada más.
- La verdad de referencia estaba en la carpeta del banco de pruebas, por encima de las ejecuciones. La política de permisos denegó todos los intentos de llegar a ella, pero una política más débil la habría dejado al alcance.
- El coste sale de los precios publicados por DeepSeek y del uso de tokens de cada ejecución, no de la factura; en el piloto, el coste calculado coincidió con el panel de DeepSeek.
- Los programas, el build y las tareas tienen las limitaciones descritas en el estudio 3: cuatro programas pequeños en C compilados con llvm-mingw, cuatro grupos y preguntas redactadas por el autor.
- Añadido el 16 de octubre de 2026: las ejecuciones se lanzaron desde la app de escritorio de Claude, cuyo entorno fija dos ajustes de Claude Code: `DISABLE_MICROCOMPACT=1`, que desactiva la limpieza de los resultados viejos de herramientas del contexto, y `API_TIMEOUT_MS=900000`. El arnés no los filtraba, así que con toda probabilidad llegaron a todas las ejecuciones. Se aplicaron a todas las condiciones por igual, así que ninguna comparación cambia, pero las cifras absolutas de tokens y de coste pueden ser más altas que con los valores por defecto de Claude Code. Desde el estudio 5 el arnés los descarta ([ADR 0018](../../docs/adr/0018-benchmark-isolation.md)).

## Cómo reproducirlo

Las tareas, la verdad de referencia y la semilla del sorteo de objetivos son las del estudio 3, publicadas en [`bench/results/study-3/`](../../bench/results/study-3/) y [`challenges/real-tasks-study-3.json`](../../challenges/real-tasks-study-3.json). La ejecución necesita una clave de la API de DeepSeek, en un archivo indicado por `REA_LAB_BENCH_DEEPSEEK_KEY_FILE` o en la carpeta del banco de pruebas.

```powershell
npm ci
npm run setup
node scripts/setup.mjs --manifest sources.json
node challenges/real.mjs --out <carpeta>
node challenges/real-tasks.mjs resolve challenges/real-tasks-study-3.json --build <carpeta>
node bench/run.ts --study study-4 --provider deepseek --model deepseek-flash --effort medium --set <carpeta> --conditions A,B --repetitions 1 --order-seed 20261018 --timeout-min 30 --max-budget-usd 50 --challenges r02,r03,r04,r05,r06,r08,r09,r10,r11,r12,r14,r15,r16,r17,r18,r20,r21,r22,r23,r24
node bench/report.ts --study study-4 --compare bench/results/study-3/results.jsonl
```

Las ejecuciones calificadas están publicadas en [`bench/results/study-4/`](../../bench/results/study-4/), con las medidas de contexto a posteriori en `context.json`, y el informe se regenera a partir de ellas con una sola orden:

```powershell
node bench/report.ts --results bench/results/study-4/results.jsonl --compare bench/results/study-3/results.jsonl --out <carpeta>
```

Cómo funciona el banco de pruebas, su aislamiento y su calificación se explica en [`bench/`](../../bench/README.es.md).
