# c02-xor: qué le hace un compilador que optimiza a una contraseña escondida con XOR

<p><a href="README.md">Read in English</a></p>

El primer writeup sobre uno de los retos propios del laboratorio, así que la respuesta se conoce antes de empezar. `c02-xor` guarda su contraseña codificada con XOR y una clave de un byte, y la decodifica mientras comprueba la entrada. El agente analizó dos variantes compiladas desde el mismo código, las dos sin símbolos: una sin optimizar (`-O0`) y otra optimizada (`-O2`). La sorpresa está en la segunda.

## Objetivos

| | `c02-xor-x64-O0-strip.exe` | `c02-xor-x64-O2-strip.exe` |
|---|---|---|
| SHA-256 | `63d3ae96dd7dcb7b62b49534b645c72695a05b71613960abf962e174500dacf4` | `4ec8d5c0ccdacb378dd0de8113b6cf9b0b04f3194e346a3d6b1bb41eccc5f25f` |
| Tamaño | 10.752 bytes | 10.752 bytes |
| Compilación | llvm-mingw 20261006, x64, sin símbolos | la misma, con `-O2` |

Los dos se recompilan desde la semilla pública con `npm run challenges`, y sus huellas están en [`challenges/public-manifest.json`](../../challenges/public-manifest.json). Ver la [procedencia](provenance.json).

## Método

- rea 6.4.0 por MCP con Ghidra 12.1.4 y el JDK 21 de Temurin, en Windows 11.
- El agente (Claude Code, Opus 5.5) partió de la única pista visible en un binario sin símbolos, las cadenas `ACCESS GRANTED` y `ACCESS DENIED`; siguió sus referencias hasta la función que las escribe y la descompiló. Una sesión final por variante generó [evidence-o0.json](evidence-o0.json) y [evidence-o2.json](evidence-o2.json), con 7 registros cada una.
- Después se contrastó la respuesta con `build/challenges/answers.json`, y `challenges/verify-answers.mjs` confirma que todas las variantes la aceptan.

## Hallazgos

| # | Hallazgo | Evidencia | Confianza |
|---|---|---|---|
| 1 | Sin símbolos, el único punto de apoyo son las dos cadenas de resultado | `ev_0ac6c080aa49665f`, `ev_6d738a84a9b1efce` | observed |
| 2 | Con `-O0`, la función que escribe el resultado (`FUN_140001470`) llama a una comprobación aparte, `FUN_140001510` | `ev_b3191df5fd04c0a6`, `ev_549e3c3463e8e8f2` | observed |
| 3 | La comprobación exige 14 caracteres y compara cada byte de la entrada, con XOR `0x51`, con los bytes codificados `"6#>'4\|38#29\|ha"` | `ev_c8c0bb3bb98491a2` | observed |
| 4 | Al decodificar esos bytes sale `grove-birch-90` | hallazgo 3 | derived |
| 5 | Con `-O2`, la comprobación se integra en la función principal, el XOR desaparece y la entrada se compara directamente con los caracteres en claro `g r o v e - b i r c h - 9 0`, repartidos en registros SIMD, más una comprobación de longitud de 14 | `ev_bc7dcdc955b10041` | observed |
| 6 | Las dos variantes llevan a la misma respuesta, que coincide con la verdad de referencia (`grove-birch-90`, clave `0x51`) | `build/challenges/answers.json` | verified |

La comprobación con `-O0`, tal como la reconstruyó Ghidra:

```c
if (strlen(param_1) == 0xe) {
  for (local_20 = 0; local_20 < 0xe; local_20++) {
    if ((byte)(param_1[local_20] ^ 0x51U) != "6#>'4|38#29|ha"[local_20]) return 0;
  }
  return 1;
}
```

Y un fragmento de la misma comprobación con `-O2`, donde el compilador ya ha hecho la decodificación:

```c
-(SUB81(local_98._0_8_,1) == 'r')  ...  -((char)local_98._0_8_ == 'g')
-(SUB81(local_98._0_8_,2) == 'o')  ...  -(SUB81(local_98._0_8_,3) == 'v')
if (sVar5 != 0xe) pcVar4 = "ACCESS DENIED";
```

## Por qué desapareció la ofuscación

Los bytes codificados y la clave son constantes conocidas al compilar, así que con `-O2` el compilador calcula `encoded[i] ^ 0x51` durante la compilación, integra la comprobación en `main` y vectoriza la comparación. La contraseña acaba en el binario como valores inmediatos. Un XOR con constantes no protege nada frente a un compilador que optimiza, y el resultado descompilado es más ruidoso pero más directo: la respuesta se lee sin decodificar nada.

## Inferido, no observado

- Llamar `main` a `FUN_140001470` sale de su comportamiento (lee una línea, la comprueba y escribe el resultado), no de un símbolo.
- El orden de los caracteres con `-O2` se lee de los desplazamientos de bytes en las comparaciones SIMD; la verdad de referencia lo confirma.

## Errores del agente

- Ninguno en las sesiones finales. Localizar la comprobación llevó cuatro pasadas cortas por variante, porque cada pasada vuelve a abrir el binario para resolver la siguiente dirección.

## Preguntas abiertas

- Ninguna sobre la respuesta. Una variante reservada de esta familia dirá si un agente encuentra la contraseña sin conocer el código ni la semilla.

## Cómo reproducirlo

```powershell
npm ci
npm run setup
npm run challenges
node scripts/rea-session.mjs writeups/2026-10-own-xor/session-plan-o0.json build/own-xor-o0
node scripts/rea-session.mjs writeups/2026-10-own-xor/session-plan-o2.json build/own-xor-o2
```

Los binarios son reproducibles, así que con rea 6.4.0 y Ghidra 12.1.4 los registros coinciden con la evidencia publicada después de pasarlos por `scripts/sanitize.mjs`.

## Licencia

El código del reto tiene licencia MIT; este writeup y sus datos de evidencia se publican con CC BY 4.0.
