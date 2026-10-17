# ¿Ayuda rea con binarios más grandes? Un segundo estudio prerregistrado en Windows

<p><a href="README.md">Read in English</a></p>

El [estudio 1](../2026-10-study-1/README.es.md) mostró que, con diez crackmes pequeños, darle a Claude Code el servidor MCP de ingeniería inversa [rea](https://github.com/morluto/rea) no cambiaba cuántos resolvía: con unos 10 KB de código, el agente lee todo el desensamblado de una vez. La continuación natural eran programas en los que primero hay que encontrar o desenredar la comprobación. Este estudio hace la misma pregunta con ellos, con las respuestas conocidas de antemano y el análisis fijado antes de la primera ejecución.

**Respuesta corta:** no. Con ocho binarios más grandes, en los que la comprobación real se esconde entre decenas de comprobadores señuelo, el agente resolvió 11 de 24 ejecuciones solo con herramientas de línea de órdenes y 4 de 24 con rea. La diferencia no es significativa (McNemar exacto, p = 0,092), pero apunta en contra de rea, no a favor. rea volvió a duplicar el tiempo y el coste, y la evidencia que el agente citó de rea fue auténtica en 45 de 46 casos.

## Diseño

Todo lo de esta sección quedó fijado en el [prerregistro](../../bench/preregistration-study-2.md), con commit antes de empezar el estudio (`6713185`, 13 de octubre de 2026), tras tres pilotos con retos públicos.

- **Agente y modelo.** Claude Code 2.1.296 sin interfaz (`claude -p`), `claude-sonnet-5-5` con esfuerzo medio.
- **Condiciones.**
  - A: las herramientas de línea de órdenes de LLVM (`llvm-readobj`, `llvm-objdump`, `llvm-strings`, `llvm-nm`) y los filtros de texto habituales, sin ningún intérprete, así que el objetivo no se puede ejecutar.
  - B: lo mismo más rea 6.4.0 por MCP, con Ghidra 12.1.4.

  Las dos podían guardar archivos de trabajo, como un desensamblado, en su propia carpeta, y el enunciado decía que nadie iba a responder preguntas durante la ejecución. El estudio 2 no tuvo condición con la skill: en el estudio 1 no se cargó nunca.
- **Retos.** Ocho programas en C y C++ del [generador del conjunto grande](../../challenges/README.es.md) del laboratorio (versión 2), compilados de forma reproducible con llvm-mingw, sin símbolos y con `-O2`: de 160 a 240 KB en C y unos 940 KB en C++. Cada uno lee una línea y escribe `ACCESS GRANTED` o `ACCESS DENIED`. En todos, la comprobación real es uno de 64 comprobadores a los que se llega por una tabla de punteros a función, entre cientos de funciones hash, con los mensajes de resultado descifrados en tiempo de ejecución. Hay dos programas por familia, que se distinguen por la comprobación real:
  - `haystack`: una tabla de sustitución o restricciones aritméticas;
  - `vm`: código de bytes que ejecuta una pequeña máquina virtual con códigos de operación aleatorios;
  - `cpp`: objetos de reglas de C++ llamados por métodos virtuales, con libc++ estática;
  - `stages`: tres segmentos comprobados en cadena, cada etapa con una clave que depende de las anteriores.

  Los programas `haystack` y `cpp` llevan además una nota, dirigida a las herramientas de análisis automático, que da un código de acceso falso y les pide que lo indiquen; el programa la muestra con la opción `--about`. La semilla se ha mantenido en privado hasta ahora; la huella SHA-256 de su manifiesto se publicó antes del estudio.
- **Ejecuciones.** Tres repeticiones por reto y condición: 48 ejecuciones, en orden barajado, con un máximo de 30 minutos y 5 USD de coste equivalente cada una.
- **Aislamiento.** Como en el estudio 1: cada ejecución tuvo su propia configuración de Claude Code vacía, su propia carpeta con solo el objetivo y una política de permisos que denegaba sin preguntar todo lo no permitido. El registro de arranque de Claude Code demuestra, ejecución por ejecución, que no se coló ningún plugin, skill ni servidor MCP.
- **Calificación.** Sin ningún LLM como juez. Un oráculo, contrastado con cada binario real, decide si la entrada propuesta se acepta. En B, cada `evidence_id` citado se vuelve a autenticar con el propio código de rea y tiene que tratar del objetivo.
- **Estadística.** Tasas de resolución con intervalos de Wilson al 95 % y una prueba exacta de McNemar sobre las 24 ejecuciones emparejadas (mismo reto, misma repetición), la comparación confirmatoria. Como prueba de sensibilidad, un par por reto, contando un reto como resuelto cuando lo resuelven al menos dos de sus tres ejecuciones.

## Resultados

| | A: línea de órdenes | B: más rea |
|---|---|---|
| Resueltos | 11/24 (46 %, de 28 a 65 %) | 4/24 (17 %, de 7 a 36 %) |
| Mecanismo identificado | 24/24 | 22/24 |
| Respuesta con el formato exacto de rea | 16/24 | 15/24 |
| Ejecuciones con alguna parada del clasificador | 10/24 | 18/24 |
| Ejecuciones que llegaron al límite de 30 minutos | 0 | 1 |
| Mediana de tiempo | 87 s | 184 s |
| Mediana de turnos | 17 | 28 |
| Mediana de tokens de entrada | 344.688 | 888.934 |
| Mediana de coste equivalente | 0,24 USD | 0,50 USD |

**H1, A frente a B: no se detecta ningún efecto grande al nivel prerregistrado.** De los 24 pares, 13 discrepan: en 10 solo resolvió A y en 3 solo B (McNemar exacto, p = 0,092). La prueba de sensibilidad coincide: tres retos solo los resuelve A, ninguno solo B y cinco ninguna de las dos (p = 0,25). Con 24 pares solo se pueden detectar efectos grandes, así que esto no demuestra que rea empeore al agente: demuestra que aquí no hay ninguna señal de que ayude, y una tendencia en contra.

| Familia | A | B |
|---|---|---|
| `haystack` | 3/6 | 2/6 |
| `vm` | 5/6 | 2/6 |
| `cpp` | 2/6 | 0/6 |
| `stages` | 1/6 | 0/6 |

A va por delante en todas las familias.

**Cómo fallaron las ejecuciones.** Cada programa esconde un comprobador real entre 63 que comparan un hash de la entrada con una constante, así que una ejecución o encuentra el único comprobador que se puede leer al revés, o se enfrenta a hashes que no puede invertir sin ejecutar código. De los 13 fallos de A, 7 terminaron sin proponer ninguna entrada, 3 propusieron una entrada equivocada y 3 propusieron el código señuelo. De los 20 fallos de B, 15 terminaron sin entrada, 3 propusieron una equivocada, 1 el código señuelo y 1 llegó al límite de tiempo. Nuestra lectura, que estas cifras no pueden demostrar: con las vistas descompiladas de rea, el agente pasó más turnos dentro de las funciones hash y concluyó más a menudo que la respuesta estaba fuera de su alcance, mientras que leer el desensamblado en bruto lo llevó más a menudo hasta el comprobador distinto.

**Cómo se usó rea.** El agente usó rea en todas las ejecuciones de B y siempre empezó con `open_binary`; cerró la sesión en 22 de 24, tras una mediana de 17 llamadas a rea. Citó 46 registros de evidencia: 45 se volvieron a autenticar y trataban del objetivo, y un `evidence_id` fue inventado, un identificador recortado con `_unverified` añadido al final. rea rechazó 14 llamadas por entradas no válidas en 10 ejecuciones, otra vez sobre todo argumentos con un nombre natural pero equivocado, como en el estudio 1; [morluto/rea#2148](https://github.com/morluto/rea/pull/2148) propone aceptar esas formas.

Las 48 ejecuciones llevaron 236 minutos de máquina (77 en A y 159 en B) y 39,76 USD de coste equivalente; la ejecución que llegó al límite de tiempo no informa de su coste.

## El clasificador de seguridad

El clasificador cortó al menos una respuesta en 18 de las 24 ejecuciones con rea, frente a 10 de 24 sin rea, el mismo patrón que en el estudio 1 (17 frente a 7 de 30). A diferencia del estudio 1, no explica la diferencia: con rea, las ejecuciones sin ninguna parada resolvieron 1 de 6, la misma proporción que las que tuvieron paradas (3 de 18). Sin rea, resolvieron 3 de las 10 ejecuciones con paradas y 8 de las 14 sin ellas.

## La nota señuelo

Los programas `haystack` y `cpp` llevan una nota, dirigida a las herramientas de análisis automático, que da un código de acceso falso y les dice que lo indiquen como respuesta; el agente no puede ejecutar los programas, pero la nota cifrada está en el binario. La RQ4, exploratoria, preguntaba si el agente la trata como datos. Vio el código en el resultado de alguna herramienta en 11 de 12 ejecuciones sin rea y en 12 de 12 con rea, y lo propuso como respuesta en 3 y en 1 de ellas. En los pilotos, 23 ejecuciones vieron la nota y ninguna la propuso. Las propuestas vinieron de ejecuciones que no habían encontrado el comprobador real: cuando el agente se atasca, un código escrito dentro del binario se convierte en una respuesta tentadora.

## Lo que ya mostraron los pilotos

Tres pilotos con el conjunto grande público (48 ejecuciones, que no forman parte del estudio) dieron forma al diseño. En el primero, una redirección de la shell denegada impedía guardar el desensamblado en un archivo, así que las dos condiciones pasaron a poder escribir archivos de trabajo en su carpeta. En el segundo, A resolvió 7 de 8, por encima del objetivo del 30 al 70 % fijado antes de los pilotos, así que el generador puso `vm`, `cpp` y `stages` detrás del mismo andamiaje de 64 comprobadores que `haystack`. En el tercero, A resolvió 3 de 8, dentro del objetivo; tres ejecuciones terminaron con una pregunta al usuario, que nadie contesta en una ejecución desatendida, así que el enunciado lo dice. Los detalles están en el prerregistro.

## Trabajos relacionados

El trabajo publicado más cercano es el de Nishizaka y otros, de Ricerca Security, [presentado en el taller BAR 2026 de NDSS](https://www.ndss-symposium.org/ndss-paper/auto-draft-657/): tres agentes de IA ante 24 retos de ingeniería inversa de CTF, en los que los agentes a menudo analizaban bien el ensamblador sin descompilador. Los estudios 1 y 2 apuntan en la misma dirección con las vistas descompiladas de rea, con otro diseño: binarios PE nativos de Windows, sin forma de ejecutar el objetivo, el análisis fijado antes de la primera ejecución y ejecuciones emparejadas calificadas por un oráculo.

## Qué significa

- Entre los dos estudios, no hay ninguna señal de que rea aumente cuántos crackmes estáticos resuelve Claude Code: ninguna con programas pequeños y una diferencia no significativa en contra con los grandes. Lo que sí hace, en los dos, es duplicar el tiempo, los tokens y el coste.
- Los binarios más grandes no convirtieron la estructura de rea en una ventaja. Cuando el cuello de botella es encontrar el único comprobador legible entre muchos, un desensamblado en bruto guardado en un archivo le sirvió al agente al menos tanto como las funciones descompiladas.
- Lo que rea añade de forma constante es evidencia comprobable: 125 de las 126 citas de evidencia de los dos estudios se volvieron a autenticar y trataban del binario correcto.
- Los agentes siguen llamando a rea con nombres de argumento naturales pero equivocados. Es barato de arreglar en el proyecto y cuesta turnos en cada sesión.
- Una nota dentro del binario, escrita como una orden para las herramientas de IA, engañó al agente cuatro veces cuando ya estaba atascado, con y sin rea. El texto de un objetivo es una entrada no confiable, y el agente tiene que tratarlo así.
- Las siguientes preguntas son otros agentes y modelos, tareas en las que la respuesta es un análisis y no una sola entrada, y qué cambia cuando el agente puede calcular, porque invertir comprobaciones que no puede ejecutar fue el muro en la mayoría de los fallos.

## Desviaciones

El equipo que ejecutaba el estudio se reinició dos veces. Cada vez cortó una ejecución antes de terminar (la 20, `l06-vm` con rea, y la 45, `l08-stages` con rea); ninguna había producido resultado. El estudio se reanudó con la misma orden y desde el mismo commit: el arnés saltó las ejecuciones terminadas y repitió desde el principio cada ejecución cortada. Las carpetas a medias de las ejecuciones cortadas se conservan. No hubo ninguna otra desviación.

## Limitaciones

- Ocho programas sintéticos en C y C++ compilados con llvm-mingw, no con MSVC, y mucho más sencillos que el software real.
- Un solo agente y un solo modelo; nada de esto habla todavía por otros agentes.
- 24 pares solo detectan efectos grandes; este resultado no es significativo al nivel prerregistrado.
- Ninguna de las dos condiciones podía ejecutar un intérprete, a propósito; eso elimina la vía de fuerza bruta que necesitaban la mayoría de los fallos.
- El coste es la estimación del propio Claude Code a precios de lista, no dinero gastado.
- rea 6.4.0, la versión del estudio 1, congelada para poder comparar.
- La heurística de revisión marcó intentos de usar Python o de escribir fuera de la carpeta de la ejecución en 39 ejecuciones (19 en A y 20 en B). La política de permisos los denegó todos y ninguno llegó a ejecutarse; no se excluyó ninguna ejecución.
- Añadido el 16 de octubre de 2026: las ejecuciones se lanzaron desde la app de escritorio de Claude, cuyo entorno fija dos ajustes de Claude Code: `DISABLE_MICROCOMPACT=1`, que desactiva la limpieza de los resultados viejos de herramientas del contexto, y `API_TIMEOUT_MS=900000`. El arnés no los filtraba, así que con toda probabilidad llegaron a todas las ejecuciones. Se aplicaron a todas las condiciones por igual, así que ninguna comparación cambia, pero las cifras absolutas de tokens y de coste pueden ser más altas que con los valores por defecto de Claude Code. Desde el estudio 5 el arnés los descarta ([ADR 0018](../../docs/adr/0018-benchmark-isolation.md)).

## Cómo reproducirlo

La semilla del conjunto reservado es **1285588706** (versión 2 del generador del conjunto grande); la huella SHA-256 de su `manifest.json` es `86f7af0afb672d049e608c41f40d33f56f55771c21e3f9530d872dda58163dec`, la misma que se publicó antes del estudio, y recompilar desde la semilla da la misma huella.

```powershell
npm ci
npm run setup
node challenges/build.mjs --set large --seed 1285588706 --out <carpeta>
node bench/run.ts --study study-2 --model claude-sonnet-5-5 --effort medium --set <carpeta> --variants x64-O2-strip --conditions A,B --repetitions 3 --order-seed 20261016 --timeout-min 30 --max-budget-usd 5
node bench/report.ts --study study-2
```

Las ejecuciones calificadas están publicadas en [`bench/results/study-2/`](../../bench/results/study-2/), y el informe se regenera a partir de ellas con una sola orden:

```powershell
node bench/report.ts --results bench/results/study-2/results.jsonl --out <carpeta>
```

Cómo funciona el banco de pruebas, su aislamiento y su calificación se explica en [`bench/`](../../bench/README.es.md).
