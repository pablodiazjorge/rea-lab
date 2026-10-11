# WinHelloCPP: qué recuperan rea y Ghidra de una aplicación Win32

<p><a href="README.md">Read in English</a></p>

WinHelloCPP es uno de los ejercicios que trae Ghidra: una aplicación de ventana Win32 clásica que incluye su código fuente. Por eso es una buena primera prueba: cada afirmación de rea se puede contrastar con lo que escribió el programador. Este writeup sigue a un agente que busca el código propio del programa entre casi 400 funciones y compara el resultado descompilado con el original.

## Objetivo

| | |
|---|---|
| Archivo | `WinHelloCPP.exe`, 110.592 bytes |
| SHA-256 | `7a98a934de5f578c3a547af873221b221d037bafa87ceee71dd4f089dd228202` |
| Formato | PE, x86, aplicación gráfica Win32 |
| Origen | Distribución de Ghidra 12.1.4, `docs/GhidraClass/ExerciseFiles/WinhelloCPP` (licencia Apache 2.0) |
| En este repositorio | No: `npm run setup` lo copia desde Ghidra a `targets/` ([procedencia](provenance.json)) |

## Método

- rea 6.4.0 por MCP con Ghidra 12.1.4 y el JDK 21 de Temurin, en Windows 11, a través del lanzador portátil del laboratorio.
- El agente (Claude Code, Opus 5.5) eligió las consultas en cuatro pasadas de exploración y después lanzó una pasada final con todas las que necesitaba. Esa pasada final generó [evidence.json](evidence.json): 18 registros de evidencia, limpiados con `scripts/sanitize.mjs` y autenticados de nuevo por rea.
- Cada pasada importa y analiza el binario una vez (unos 23 s); las consultas posteriores responden en menos de 0,1 s. La misma consulta devolvió el mismo `evidence_id` en todas las pasadas: el análisis es determinista.

## Hallazgos

| # | Hallazgo | Evidencia | Confianza |
|---|---|---|---|
| 1 | 6 segmentos, 388 funciones y 254 cadenas | `ev_6439559871cd0307` | derived |
| 2 | 103 funciones son importadas y 285 internas; Ghidra pone nombre a 215 (biblioteca de C y código de arranque) y deja 70 como `FUN_…` | `ev_8323a93243b6f54a` | observed |
| 3 | Es una compilación ANSI: las funciones de ventana son las variantes `A` (`LoadStringA`, `RegisterClassExA`, `CreateWindowExA`…) | `ev_8323a93243b6f54a` | observed |
| 4 | `FUN_004014e0` carga dos cadenas de recursos, registra la clase de ventana y ejecuta el bucle de `GetMessageA` | `ev_5114411afdb29dfc`, `ev_5098d42c7be09ba0`, `ev_a6091642625a853c`, `ev_32a79de023a19b38`, `ev_191d2403a9b94fc8` | observed |
| 5 | `FUN_00401040` crea, muestra y actualiza la ventana principal | `ev_e760d08701c565d9`, `ev_c3254c1d91338855`, `ev_fb2efd603343840f` | observed |
| 6 | `FUN_00401240` es el procedimiento de ventana: atiende los mensajes 2, 0xF y 0x111 y pasa el resto a `DefWindowProcA` | `ev_dd6016368760a7f5`, `ev_b5b5bb534228759a`, `ev_56a22b2ddc6db966`, `ev_cc202770a82fef13` | observed |
| 7 | `DialogBoxParamA` se llama una sola vez, en `0x4012f7` dentro del procedimiento de ventana, a través de la tabla de importaciones | `ev_bcebb45f66f848ee`, `ev_ca154568e68592a8` | observed |
| 8 | El procedimiento del diálogo, en `0x4010a0`, solo se pasa como puntero y Ghidra no lo convierte en función | `ev_cc202770a82fef13`, `ev_45cd3403317548d6` | observed |

## El código descompilado frente al original

| Pseudocódigo de Ghidra | Código original | Comentario |
|---|---|---|
| `FUN_004014e0` | `_tWinMain` | Sus dos primeras llamadas son `addPeople` e `initializePeople` |
| `LoadStringA(param_1, 0x67, …)`, `LoadStringA(param_1, 0x6d, …)` | `IDS_APP_TITLE` (103), `IDC_WINHELLOCPP` (109) | Los identificadores de recursos solo sobreviven como números |
| `FUN_00401390` y `RegisterClassExA` en quien la llama | `MyRegisterClass` | El compilador movió la llamada de registro a `WinMain` |
| `FUN_00401040` | `InitInstance` | Prácticamente idéntica |
| `FUN_00401240` | `WndProc` | `WM_DESTROY` (2), `WM_PAINT` (0xF), `WM_COMMAND` (0x111); opciones de menú 0x68 (`IDM_ABOUT`, 104) y 0x69 (`IDM_EXIT`, 105) |
| `FUN_00401130(hdc, left, top, right, bottom)` | `doPaint(hdc, ps.rcPaint)` | El `RECT` pasado por valor se convierte en cuatro argumentos |
| `__security_check_cookie(…)` | no está en el código | Protección de la pila que añade el compilador (`/GS`) |
| `LAB_004010a0` | `About` | Una función a la que solo se llega a través de un puntero |

El procedimiento de ventana, tal como lo reconstruyó Ghidra:

```c
if (param_2 == 2) { PostQuitMessage(0); return; }                 /* WM_DESTROY */
if (param_2 == 0xf) { /* BeginPaint, FUN_00401130, EndPaint */ }   /* WM_PAINT */
if (param_2 != 0x111) { DefWindowProcA(param_1, param_2, param_3, param_4); return; }
if ((param_3 & 0xffff) == 0x68)                                    /* IDM_ABOUT */
  DialogBoxParamA(DAT_0040f064, (LPCSTR)0x67, param_1, (DLGPROC)&LAB_004010a0, 0);
else if ((param_3 & 0xffff) == 0x69) DestroyWindow(param_1);       /* IDM_EXIT */
```

Condensado del pseudocódigo de `ev_cc202770a82fef13`; los comentarios salen del código original.

## Inferido, no observado

- Los nombres `WinMain`, `InitInstance`, `WndProc` y `About` salen de comparar el código con el original. rea no los pone: el proveedor de Windows es de solo lectura, así que no se pueden renombrar funciones durante la sesión.
- Leer 0x68 y 0x69 como `IDM_ABOUT` e `IDM_EXIT` se apoya en el `Resource.h` del proyecto.

## Errores del agente

- La primera pasada buscó las funciones anchas (`RegisterClassExW`, `CreateWindowExW`, `DialogBoxParamW`) y obtuvo `name_not_found` en las tres. La lista de importaciones mostraba una compilación ANSI, y la segunda pasada usó los nombres con `A`.

## Preguntas abiertas

- El procedimiento del diálogo en `0x4010a0` no es una función en el análisis de Ghidra, así que rea no puede descompilarlo. Crearla exigiría una operación de escritura que el proveedor de Windows, de solo lectura, no ofrece.

## Coste

- Cinco sesiones de rea (cuatro de exploración y una final), cada una con una importación de Ghidra de unos 23 s.
- En este primer writeup no se midieron los tokens del agente; a partir del siguiente, el coste se registra por sesión.

## Cómo reproducirlo

```powershell
npm ci
npm run setup
node scripts/rea-session.mjs writeups/2026-10-winhellocpp/session-plan.json build/winhellocpp
node scripts/sanitize.mjs build/winhellocpp/bundle.json build/winhellocpp/evidence.json
```

Con rea 6.4.0 y Ghidra 12.1.4, los registros salen con los mismos `evidence_id` que [evidence.json](evidence.json). Otras versiones de rea dan identificadores distintos, porque el perfil de análisis forma parte del hash.

## Licencia

Este writeup y sus datos de evidencia se publican con CC BY 4.0. Los fragmentos descompilados proceden de un ejercicio de Ghidra distribuido con la licencia Apache 2.0.
