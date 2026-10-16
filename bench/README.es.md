# Banco de pruebas

<p><a href="README.md">Read in English</a></p>

¿Qué le aporta rea a un agente de programación que hace ingeniería inversa de binarios nativos de Windows? Este banco lo mide con retos cuya respuesta se conoce con exactitud, calificadores deterministas y estadística por pares. Ejecuta Claude Code sin interfaz (`claude -p`) y reutiliza el propio código de evaluación de rea donde encaja ([ADR 0019](../docs/adr/0019-reuse-rea-evaluation.md)).

## Condiciones

| Condición | El agente dispone de |
|---|---|
| A | `llvm-readobj`, `llvm-objdump`, `llvm-strings`, `llvm-nm` y algunos filtros de texto, a través de Bash, además de lectura de archivos |
| B | Lo de A, más rea por MCP con Ghidra |
| C | Lo de B, más la skill de rea (`reverse-engineer-anything`) |

El modelo, el esfuerzo, la estructura del prompt y los límites son los mismos en todas las condiciones. No se permite ningún intérprete, así que el agente no puede ejecutar el objetivo: la tarea es de análisis estático.

## Tarea y respuesta

Cada ejecución recibe un reto de [`challenges/`](../challenges/README.es.md), renombrado como `target.exe`, y tiene que encontrar una entrada que le haga escribir `ACCESS GRANTED` y explicar cómo la comprueba el programa. La respuesta es el manifiesto cerrado de reclamaciones de rea, un único objeto JSON y nada más, con dos reclamaciones: `accepted_input` y `check_mechanism`. En las condiciones B y C cada reclamación cita el `evidence_id` del resultado de rea que la respalda.

## Tareas con software real

El estudio 3 cambia los crackmes por programas libres reales compilados sin símbolos ([ADR 0024](../docs/adr/0024-real-software-tasks.md)). Cada ejecución hace una pregunta sobre dónde está una función o una tabla, y la respuesta tiene dos reclamaciones: `answer_address`, la dirección virtual donde empieza, y `source_name`, una suposición de su nombre en el código fuente. La respuesta es correcta si la dirección cae dentro del rango del objetivo en el mapa del build completo; el inicio exacto, una dirección dada sin la base de imagen, el nombre en el código y, en B, si la Evidence citada recoge esa dirección se informan aparte. Una ejecución puede leer además los archivos donde Claude Code guarda los resultados demasiado grandes para devolverlos directamente, y la evidencia de un resultado de rea guardado cuenta como entregada ([ADR 0019](../docs/adr/0019-reuse-rea-evaluation.md)). Las tareas salen de [`challenges/real-tasks.mjs`](../challenges/real-tasks.mjs) y el [prerregistro del estudio 3](preregistration-study-3.md) describe el diseño.

## Calificación

No interviene ningún LLM como juez.

| Medida | Cómo se decide |
|---|---|
| Resuelto (resultado principal) | El oráculo del reto acepta `accepted_input` ([`oracle.mjs`](../challenges/oracle.mjs), contrastado con cada binario real en Windows) |
| Mecanismo | `check_mechanism` coincide con la familia del reto; en las compilaciones `-O2` de familias de respuesta única, donde el compilador puede convertir la comprobación en una comparación con constantes, también vale `string_compare` |
| Manifiesto estricto | El mensaje final es exactamente un manifiesto con la forma de rea |
| Paradas del clasificador y rechazos | Respuestas cortadas por el clasificador de seguridad del modelo, y ejecuciones que acabaron sin respuesta por una de ellas; se informan aparte |
| Citas de evidencia (B, C) | Cada `evidence_id` citado pertenece a una Evidence que rea entregó en la ejecución, que se vuelve a autenticar con `parseEvidence` de rea y que trata del mismo SHA-256 que el objetivo |
| Uso de rea (B, C) | `evaluateCodexEvents` de rea mediante un adaptador: si usó rea, si la primera llamada fue `open_binary`, si abrió y cerró la sesión, las llamadas repetidas y los fallos de validación de entrada |
| Coste y esfuerzo | Tiempo real, turnos, tokens y coste equivalente según el resultado de Claude Code |
| Avisos | Permisos denegados y rutas fuera de la carpeta de la ejecución, que se revisan antes de publicar un estudio |

Las tasas de resolución llevan intervalos de Wilson al 95 %, y cada par de condiciones se compara con una prueba exacta de McNemar sobre el mismo reto, la misma variante y la misma repetición. Con unas pocas decenas de pares solo se detectan efectos grandes, y el informe lo dice.

## Aislamiento

Cada ejecución tiene su propia carpeta fuera del repositorio, su propio `CLAUDE_CONFIG_DIR` vacío, `--strict-mcp-config`, `--setting-sources user` y `--permission-mode dontAsk`, de modo que no le llega nada de la configuración del usuario y lo que no está permitido se deniega sin preguntar. Detalles en el [ADR 0018](../docs/adr/0018-benchmark-isolation.md).

Con `--provider deepseek`, el mismo Claude Code lo sirve la API de DeepSeek compatible con la de Anthropic. La ejecución recibe la dirección de DeepSeek, su clave y un modelo `deepseek-*` explícito en todas las ranuras de modelo, nunca el token de Anthropic, y la búsqueda de herramientas se fuerza para que los esquemas de rea sigan diferidos, como con los modelos de Anthropic. Cada ejecución registra el modelo que sirvió de verdad la API, y su coste se calcula a partir del uso con los precios de DeepSeek ([`prices.ts`](prices.ts)); la cifra del propio Claude Code, que usa precios de Claude, se guarda aparte.

## Cómo se ejecuta

```powershell
npm run challenges                        # compila los retos públicos
npm run bench:test                        # pruebas unitarias de los calificadores, el adaptador de rea y la estadística
node bench/run.ts --study pilot --model <modelo> --dry-run
```

Una tanda real necesita un token de larga duración de `claude setup-token`, guardado en `oauth-token` dentro de la carpeta del banco (`%LOCALAPPDATA%\rea-lab-bench`, o `REA_LAB_BENCH_HOME`), o indicado en `REA_LAB_BENCH_OAUTH_TOKEN`. El token solo llega al proceso hijo. Después se comprueba el aislamiento con una sesión trivial por condición y se lanza la tanda:

```powershell
node bench/run.ts --study probe --model <modelo> --probe
node bench/run.ts --study pilot --model <modelo>
node bench/report.ts --study pilot
```

Tras corregir un calificador, `node bench/regrade.ts --study <nombre>` vuelve a calificar un estudio a partir de sus transcripciones guardadas, sin repetir ninguna ejecución. Las transcripciones en bruto se quedan en la carpeta del banco. `node bench/report.ts --study <nombre> --publish` copia las ejecuciones calificadas, sin rutas personales, en `bench/results/<nombre>/` junto con el informe. Añadir `--compare <archivo de resultados>` compara el estudio tarea por tarea con otro estudio sobre las mismas tareas, como hace el estudio 4 con el 3. `node bench/context.ts --study <nombre>` muestra medidas de contexto a posteriori sacadas de las transcripciones, como los resultados de rea guardados en archivos por herramienta, las ejecuciones que vuelven a leer alguno y la entrada de la primera petición de cada ejecución, sin rutas locales.

## Limitaciones

- Los retos son programas pequeños en C compilados con llvm-mingw, no con MSVC, y mucho más simples que el software real.
- Un solo agente (Claude Code) y un solo modelo por estudio, así que los resultados todavía no dicen nada de otros agentes.
- `total_cost_usd` es un coste equivalente, no dinero gastado en una suscripción.
