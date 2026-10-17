# ¿Una skill mejor abarata rea? Un quinto estudio prerregistrado en Windows

<p><a href="README.md">Read in English</a></p>

[rea](https://github.com/morluto/rea) incluye una skill, `reverse-engineer-anything`, que le explica a un agente cómo usar sus herramientas. En el [estudio 1](../2026-10-study-1/README.es.md) el agente no llegó a cargarla, así que nunca se había medido su contenido, y en el [estudio 3](../2026-10-study-3/README.es.md) rea localizó funciones de programas reales tantas veces como las herramientas de línea de órdenes, con más del doble de coste mediano. Este estudio puso el texto de la skill delante de Claude Code y preguntó si abarata rea, y si una versión revisada, escrita a partir de las transcripciones de los estudios anteriores y de guías publicadas, lo hace mejor que la oficial.

**Respuesta corta:** no, y la revisión lo empeoró. En 30 tareas nuevas sobre los cuatro programas del estudio 3, la skill mejorada encareció las ejecuciones un 14 % frente a la oficial (cociente de Hodges-Lehmann 1,14, intervalo del 95 % de 1,05 a 1,26, Wilcoxon exacto p = 0,012), justo lo contrario de aquello para lo que se escribió. La skill oficial no cambió nada medible frente a no tener skill (cociente 0,98, p = 0,84). Ni los aciertos ni las citas fueron distintos. La skill mejorada sí cambió el proceso como pretendía (el agente casi dejó de listar todas las funciones), pero dio más pasos, y en Claude Code el coste sigue al contexto que se escribe en la caché en cada paso.

## Diseño

Todo lo de esta sección quedó fijado en el [prerregistro](../../bench/preregistration-study-5.md), con commit antes de empezar el estudio (`ade504a`, 17 de octubre de 2026), tras tres rondas de ajuste de la skill mejorada, el sorteo de tareas y un piloto.

- **Tres condiciones,** todas con rea 6.4.0 por MCP y Ghidra 12.1.4, las herramientas de línea de órdenes de LLVM y filtros de texto, y sin intérprete, como la condición B del estudio 3:
  - B, sin skill;
  - C1, más el cuerpo del `SKILL.md` oficial de rea 6.4.0;
  - C2, más la skill mejorada ([`bench/skills/reverse-engineer-anything-improved/`](../../bench/skills/reverse-engineer-anything-improved/)).
- **Cómo llegó la skill al agente.** Su cuerpo entró en el prompt del sistema con `--append-system-prompt-file` de Claude Code, tras una frase fija, y sus archivos `references/` se podían leer en la carpeta de configuración de la ejecución ([ADR 0025](../../docs/adr/0025-skill-comparison.md)). El estudio mide el contenido de la skill, no si un cliente decide cargarla.
- **La skill mejorada.** El texto oficial más una sección sobre cómo localizar código en un binario nativo: empezar por anclas (cadenas, importaciones), leer código solo de los candidatos, probar el ancla siguiente más barata antes de listar todas las funciones, no repetir llamadas idénticas y citar una evidencia sobre la función que se responde. Es un 14 % más larga (15.484 bytes frente a 13.580). Cada cambio indica su fuente en su [nota de procedencia](../../bench/skills/reverse-engineer-anything-improved/PROVENANCE.md). Tres rondas de ajuste con ocho tareas públicas, en C1 y C2, cambiaron dos pasos; después la skill se congeló (`e9f6632`) antes de sortear las tareas del estudio.
- **Tareas.** 30 tareas nuevas sobre los programas y el build del estudio 3, ninguna con un objetivo ni una función descrita del estudio 3 ni de sus pilotos: 6 de `behaviour` y 2 de `chain` en SGIEmu y flint, y 6 y 1 en c5xtools y moppe-emu. Una semilla privada ordenó los candidatos del validador, y el autor redactó todas las preguntas a partir del código fuente.
- **Ejecuciones.** 2 repeticiones por tarea y condición, 180 ejecuciones, en orden barajado. Claude Code 2.1.296 en modo sin interfaz, `claude-sonnet-5-5` con esfuerzo medio, 30 minutos y 5 USD de coste equivalente por ejecución. A diferencia de los estudios 1 a 4, Claude Code funcionó con sus valores por defecto: el arnés ya no pasa los ajustes que fija la app de escritorio ([ADR 0018](../../docs/adr/0018-benchmark-isolation.md)).
- **Medida y pruebas.** Una sola medida confirmatoria, el coste por ejecución. H1 compara C1 con C2 y H2 compara B con C1, cada una con un Wilcoxon de rangos con signo exacto y bilateral sobre el logaritmo del cociente de los costes medios de cada tarea, con alfa 0,05, y el cociente de Hodges-Lehmann con su intervalo exacto. Un borrador probaba además si la evidencia citada contiene la dirección respondida; las rondas de ajuste mostraron que eso mide sobre todo qué herramienta se cita, así que las citas pasaron a ser descriptivas antes de congelar (ver más abajo). El acierto era una salvaguarda.

## Resultados

| | B: sin skill | C1: skill oficial | C2: skill mejorada |
|---|---|---|---|
| Correctas, todas en el inicio exacto | 52/60 (87 %, de 76 a 93 %) | 55/60 (92 %, de 82 a 96 %) | 52/60 (87 %, de 76 a 93 %) |
| Coste mediano por ejecución | 0,214 USD | 0,229 USD | 0,242 USD |
| Coste medio por ejecución | 0,280 USD | 0,255 USD | 0,304 USD |
| Turnos (mediana) | 15 | 16 | 16 |
| Tokens de salida (mediana) | 2.344 | 2.248 | 2.728 |
| Llamadas a rea (mediana) | 10 | 8 | 8 |
| Ejecuciones que abrieron y cerraron la sesión | 59/60 | 59/60 | 53/60 |
| La evidencia citada da la dirección / nombra la función | 18 / 58 | 19 / 56 | 20 / 56 |

**H1, C1 frente a C2: C2 cuesta más.** En las 30 tareas, el cociente de Hodges-Lehmann del coste de C2 sobre el de C1 es 1,140 (intervalo del 95 % de 1,047 a 1,262; W+ = 353, p = 0,0120). El análisis de sensibilidad prerregistrado, que cobra como lecturas de caché las escrituras de la primera petición de cada ejecución para quitar el efecto del orden, da lo mismo: 1,155 (de 1,043 a 1,308), p = 0,0175.

**H2, B frente a C1: no se detecta efecto.** El cociente del coste de C1 sobre el de B es 0,976 (de 0,815 a 1,156; p = 0,8394). Su análisis de sensibilidad da 0,879, p = 0,17. Frente a B, C2 tuvo un cociente de 1,122 (p = 0,146), solo como descripción.

**Aciertos.** Ningún par fue distinto (McNemar exacto: C1 frente a C2, 4 pares correctos solo con C1 y 1 solo con C2, p = 0,375; B frente a C1, 1 y 4, p = 0,375; B frente a C2, 5 y 5). Por familia, `behaviour` tuvo 40, 43 y 41 de 48, y `chain` 12, 12 y 11 de 12. c5xtools fue el programa más difícil en las tres condiciones, con 10 de 14 en cada una. La salvaguarda (C2 con más de 3 aciertos menos que C1) no se activó, y sin ventaja de coste no había nada que proteger.

**Adónde fue el coste.** Las escrituras en la caché suponen cerca del 70 % del coste de cada condición: en cada turno se escriben en la caché del prompt los mensajes más recientes, resultados de herramientas incluidos. Por tarea, C2 costó de media 0,049 USD más que C1: 0,027 en escrituras en caché (más en 19 de 30 tareas), 0,016 en lecturas de caché (21 de 30) y 0,006 en salida (21 de 30). C2 dio más turnos de media (18,9 frente a 17,1) y escribió más (3.514 tokens de salida de media, frente a 2.876).

**El proceso sí cambió.** La skill mejorada guio al agente tal como estaba escrita, así que el resultado no se explica por una guía ignorada:

| De las transcripciones (a posteriori) | B | C1 | C2 |
|---|---|---|---|
| Llamadas a `list_procedures` | 38 | 20 | 7 |
| Ejecuciones con un resultado de rea demasiado grande para devolverlo entero | 46 | 34 | 26 |
| Llamadas a `resolve_containing_procedure` / `batch_decompile` | 19 / 0 | 3 / 0 | 20 / 11 |
| Llamadas a `search_procedures` | 12 | 7 | 20 |
| Tokens de entrada de la primera petición (mediana) | 12.228 | 16.820 | 17.407 |
| Lecturas de las referencias de la skill | 0 | 0 | 0 |

Menos listados del inventario completo y menos resultados gigantes no ahorraron dinero, porque la vía dirigida dio más pasos y cada paso llevaba a la caché un contexto cada vez mayor. La skill oficial también redujo a la mitad los listados frente a no tener skill, sin efecto en el coste ni en un sentido ni en otro. En ninguna ejecución se abrieron las referencias de ninguna de las dos skills.

**Citas.** Los 360 `evidence_id` citados se autenticaron y eran del objetivo. Que la evidencia citada dé la dirección respondida como número depende de la herramienta: el código decompilado de `procedure_pseudo_code`, la más citada en las tres condiciones (41, 40 y 38 ejecuciones), solo nombra la función con el nombre por defecto del decompilador (`FUN_` y la dirección), así que nunca cuenta, mientras que los resultados de llamadores, de `procedure_info` y de `resolve_containing_procedure` sí. Contando ese nombre, la evidencia citada nombra la función respondida en 58, 56 y 56 ejecuciones. Ninguna de las dos definiciones varió entre condiciones.

**Ejecuciones marcadas.** Se marcaron 16 ejecuciones para revisarlas y no se excluyó ninguna: 8 intentaron usar Python (para buscar constantes en el binario o leer un resultado guardado) y se les denegó; 4 contenían la palabra «python» dentro de un patrón de `grep` sobre la salida de `llvm-strings`, una orden permitida; y 4 saltaron el control de rutas, dos con un acceso a la «carpeta superior» denegado, una con la propia carpeta de la ejecución y otra con texto de `awk` leído como una ruta. Ninguna ejecución llegó a la red, al equipo ni a la verdad de referencia, que esta vez estaba fuera del árbol de carpetas del banco.

**Coste y tiempo.** Las 180 ejecuciones tardaron 231 minutos de máquina y costaron 50,34 USD de coste equivalente (16,80 en B, 15,29 en C1 y 18,25 en C2), frente a los unos 70 USD que preveía el piloto. Ningún clasificador de seguridad cortó una respuesta y ninguna ejecución agotó el tiempo.

## Lo que ya mostraron las rondas de ajuste y el piloto

Tres rondas de 16 ejecuciones con las ocho tareas públicas del piloto 4 del estudio 3 compararon C1 y C2 antes de congelar ([procedencia](../../bench/skills/reverse-engineer-anything-improved/PROVENANCE.md#development-rounds)). Corrigieron una descripción errónea de lo que devuelve `xrefs` y reescribieron el paso de las citas al descubrir que el código decompilado nombra su función solo con el nombre por defecto del decompilador; ese hallazgo llevó también a una nota fechada en el writeup del estudio 3 y a que las citas fueran descriptivas. En las rondas, las diferencias de coste entre C1 y C2 quedaron dentro del ruido de una repetición (6,86 frente a 6,96 USD en total). El piloto, 12 ejecuciones en las tres condiciones, fijó el número de repeticiones con una simulación de potencia basada en la variación medida en las rondas: con 2 repeticiones, una potencia del 80 al 94 % para un cambio de coste del 20 % y del 29 al 40 % para uno del 10 % ([prerregistro](../../bench/preregistration-study-5.md#pilot-before-freezing)).

## Qué significa

- Una guía mejor redactada para rea no abarató Claude Code. La skill mejorada lo encareció un 14 %, con los mismos aciertos. Escribir una skill a partir de lo que las transcripciones muestran que el agente hace mal, y de guías publicadas, no bastó: el cambio hay que medirlo.
- La skill cambió lo que hacía el agente, en la dirección prevista. El coste extra salió de la forma del trabajo: más llamadas, más pequeñas y dirigidas, suponen más turnos, y en Claude Code cada turno escribe el contexto más reciente en la caché, que es la mayor parte de la factura. Evitar un único resultado gigante ahorra menos de lo que cuesta un turno de más.
- La skill oficial, puesta delante del agente, no cambió de forma medible ni el coste ni los aciertos frente a no tener skill.
- Estos datos no justifican la PR prevista a la skill de rea, y no se hará.
- La calidad de las citas, tal como la medían los estudios 3 y 4, refleja sobre todo qué herramienta se cita; con una definición que cuenta el nombre del decompilador, el agente citó evidencia de la función respondida en la mayoría de las ejecuciones, con skill o sin ella.

## Desviaciones

Ninguna en cómo se ejecutó el estudio: la orden prerregistrada, desde `ade504a`, sin fallos de infraestructura, sin repeticiones y sin interrupciones. El conjunto se reconstruyó con la orden `real.mjs` prerregistrada antes de congelar; esa reconstrucción descubrió que dos programas imprimen la fecha del compilador, que cambiaba dos bytes en otro día, y ahora el build la fija, así que la reconstrucción coincidió byte a byte con el manifiesto del estudio 3 ([ADR 0024](../../docs/adr/0024-real-software-tasks.md)).

## Limitaciones

- Un solo cliente y un solo modelo. La skill se inyectó en el prompt del sistema, que no es como un agente se encuentra una skill instalada; el estudio mide el contenido.
- 30 tareas en cuatro programas pequeños de C, con 2 repeticiones: se podía detectar un cambio de coste del 20 % o más, y uno del 10 % casi nunca. Los programas son grupos, y el autor redactó las preguntas.
- La skill mejorada es una sola revisión. Otra podría salir mejor; esta se congeló tras tres rondas, como permitía el plan.
- El prompt inyectado nombra la carpeta de referencias de la propia ejecución, así que su texto cambia de una ejecución a otra y cada una escribe la skill en la caché del prompt en lugar de reutilizar un prefijo común. Eso sube el coste absoluto de C1 y C2 frente a B (la primera petición escribe unos 5.400 a 6.000 tokens más), pero afecta a las dos skills por igual, y el análisis de sensibilidad, que quita las escrituras de la primera petición, da la misma H1.
- El coste es el coste equivalente de Claude Code a precios de lista, no dinero gastado.

## Reproducirlo

Las tareas, la verdad de referencia y la semilla del sorteo de objetivos (2120649789) están publicadas en [`challenges/real-tasks-study-5.json`](../../challenges/real-tasks-study-5.json) y [`bench/results/study-5/`](../../bench/results/study-5/).

```powershell
npm ci
npm run setup
node scripts/setup.mjs --manifest sources.json
node challenges/real.mjs --out <carpeta fuera de la carpeta del banco>
node challenges/real-tasks.mjs resolve challenges/real-tasks-study-5.json --build <carpeta>
node bench/run.ts --study study-5 --model claude-sonnet-5-5 --effort medium --set <carpeta> --conditions B,C1,C2 --repetitions 2 --order-seed 20261019 --timeout-min 30 --max-budget-usd 5
node bench/report.ts --study study-5
```

Las ejecuciones calificadas están publicadas en [`bench/results/study-5/`](../../bench/results/study-5/), con las medidas de contexto a posteriori en `context.json`, y el informe se regenera desde ellas con una orden:

```powershell
node bench/report.ts --results bench/results/study-5/results.jsonl --out <carpeta>
```

Cómo funciona el banco, su aislamiento y su calificación se explica en [`bench/`](../../bench/README.es.md).
