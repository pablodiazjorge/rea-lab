# Wallace v1 frente a v2: qué cambió entre dos compilaciones

<p><a href="README.md">Read in English</a></p>

El ejercicio de seguimiento de versiones de Ghidra trae dos compilaciones del mismo programa pequeño, `WallaceSrc.exe` y `WallaceVersion2.exe`, y el código de tres variantes: la original y dos modificaciones. La pregunta para el agente: ¿qué modificación es la versión 2 y qué cambió exactamente? El código fuente da la verdad de referencia, pero el agente solo trabaja con los binarios.

## Objetivos

| | `WallaceSrc.exe` | `WallaceVersion2.exe` |
|---|---|---|
| SHA-256 | `168a175ccf74e80899d2519bbe6e1ae8b0fa2489af70e8cc0720afab1ad8b0ab` | `94510664e6578bec7391d6023af414e2d2d8c4ff58ed3f618dd549ff648015cf` |
| Tamaño | 33.792 bytes | 33.792 bytes |
| Formato | PE, x86, compilación de depuración de Visual C++ 2010 | el mismo |

Los dos vienen de la distribución de Ghidra 12.1.4 (licencia Apache 2.0) y no se redistribuyen aquí; ver la [procedencia](provenance.json).

## Las dos modificaciones posibles

| Variante | Cambios en el código |
|---|---|
| Mod1 | `likesCheese` deja de ser aleatorio (`rand() * 2 < 1`) y pasa a ser `index % 3 == 0`; el gadget se usa también con quien le gusta el queso |
| Mod2 | Todo lo de Mod1, más una persona nueva (`"Sheep"`) y un estado «roto» en `Gadget` (`isBroken`, `setBroken`) |

## Método

- rea 6.4.0 por MCP con Ghidra 12.1.4 y el JDK 21 de Temurin, en Windows 11.
- El agente (Claude Code, Opus 5.5) exploró cada binario en seis pasadas cortas y después lanzó una sesión final por binario. La sesión de la versión 2 comparó además las funciones con `compare_functions`, pasándole la evidencia de `analyze_function` de la primera sesión, y resumió los resultados con `find_changed_behavior`.
- Evidencia: [evidence-src.json](evidence-src.json) (11 registros) y [evidence-version2.json](evidence-version2.json) (21 registros, con las comparaciones y cuatro preguntas abiertas que rea registró por su cuenta). Las dos están limpias y autenticadas de nuevo por rea.

## Hallazgos

| # | Hallazgo | Evidencia | Confianza |
|---|---|---|---|
| 1 | La versión 2 no es Mod2: ninguno de los dos binarios contiene la cadena `Sheep` | `ev_0eb6b69d4eb42447`, `ev_8f2925f92bc8f39d` | observed |
| 2 | La versión 2 ya no importa `rand`, que el original llama una vez en `0x4117e7`; tiene una función menos (178 frente a 179) | `ev_96d11902f71008e6`, `ev_1cf6f3402959ac88`, `ev_a4a2390e4a8b8f6e`, `ev_f6fa92932d1efed7` | derived |
| 3 | `FUN_004117c0` (original) y `FUN_004117b0` (versión 2) rellenan el mismo campo, en el desplazamiento `0x24`: de `rand() * 2 < 1` a `1 - (index % 3 != 0)`, es decir, `index % 3 == 0` | `ev_612b04f018d155b2`, `ev_4bf9c8e45ae356af` | observed |
| 4 | En la función que usa el gadget, la condición `strcmp(name, "Wallace") == 0` gana `\|\| campo_0x24 != 0`, y su flujo de control pasa de 9 a 10 bloques básicos | `ev_43c88a46453da827`, `ev_d8896ac93b541bb7`, `ev_9b39d934e2c35b14` | observed |
| 5 | El campo `0x24` que se escribe en el hallazgo 3 es el que se lee en el 4, así que la nueva condición es «usar el gadget con quien le gusta el queso» | `ev_612b04f018d155b2`, `ev_d8896ac93b541bb7` | inferred |
| 6 | La versión 2 es Mod1 | hallazgos 1 a 5 | inferred |

El cambio en el código descompilado:

```c
/* original, FUN_004117c0 */          iVar1 = rand(); *(bool *)(param_1 + 9) = iVar1 * 2 < 1;
/* version 2, FUN_004117b0 */         *(char *)(param_1 + 9) = '\x01' - (local_c % 3 != 0);

/* original, gadget loop */           if (iVar1 == 0) {
/* version 2, gadget loop */          if ((iVar1 == 0) || (*(char *)(local_24 + 0x24) != '\0')) {
```

## Qué dice la comparación de rea y cómo leerla

`compare_functions` marca como `changed` todas las dimensiones de texto en las tres funciones, también en `addPeople`, que no cambió en el código. Su propia evidencia explica el motivo: compara el texto del proveedor sin normalizar las reubicaciones, y los nombres derivados de direcciones (`FUN_…`, `LAB_…`) se desplazan entre compilaciones.

| Dimensión | `addPeople` (sin cambios, control) | `initializePeople` (cambió) | función del gadget (cambió) |
|---|---|---|---|
| Texto del pseudocódigo | `changed`, 639 → 639 caracteres | `changed`, 583 → 493 | `changed`, 1.174 → 1.216 |
| Llamadas | `changed`, 2 → 2 | `changed`, **2 → 0** | `changed`, 5 → 5 |
| Grafo de flujo de control (normalizado por direcciones) | **unchanged** | changed | changed, **9 → 10 bloques** |

El grafo de flujo de control, la única dimensión que rea normaliza por direcciones, separa los cambios reales del ruido. Para un agente, un `changed` con los mismos recuentos a los dos lados significa casi seguro direcciones desplazadas, no un comportamiento nuevo.

## Inferido, no observado

- Los hallazgos 5 y 6 combinan varias observaciones; encajan con el código de Mod1, pero rea deja como pregunta abierta la identidad de las funciones entre versiones.
- Emparejar `FUN_004117c0` con `initializePeople` y `FUN_004118f0` con la función del gadget se apoya en la llamada a `rand`, en las referencias a `"Wallace"` y en el código fuente.

## Errores del agente

- `procedure_callers` sobre el salto intermedio de `strcmp` no devolvió nada: en esta compilación de depuración las llamadas pasan por una tabla de enlazado incremental que Ghidra no encadena hasta los llamadores reales. El agente cambió a las referencias a la cadena `"Wallace"`.

## Preguntas abiertas

rea registró cuatro preguntas abiertas en el bundle de la versión 2: una por cada comparación de funciones, porque los nombres derivados de direcciones no son una identidad estable entre versiones, y «¿se comportaron igual las dos versiones en una reproducción controlada completa?». Todo es análisis estático; no se ejecutó ningún binario.

## Cómo reproducirlo

```powershell
npm ci
npm run setup
node scripts/rea-session.mjs writeups/2026-10-wallace-versions/session-plan-src.json build/wallace-src
node scripts/rea-session.mjs writeups/2026-10-wallace-versions/session-plan-version2.json build/wallace-version2
```

Con rea 6.4.0 y Ghidra 12.1.4 los registros coinciden con la evidencia publicada; para compararlos, limpia cada `bundle.json` con `scripts/sanitize.mjs`.

## Licencia

Este writeup y sus datos de evidencia se publican con CC BY 4.0. Los fragmentos descompilados proceden de un ejercicio de Ghidra distribuido con la licencia Apache 2.0.
