<h1 align="center">rea-lab</h1>

<p align="center">
  Ingeniería inversa con agentes de IA en Windows: verificar, medir y hacer visibles las herramientas que usan los agentes, con rea y Ghidra
</p>

<p align="center">
  <img src="https://img.shields.io/badge/rea-6.4.0-6f42c1" alt="rea 6.4.0">
  <img src="https://img.shields.io/badge/Ghidra-12.1.4-d32f2f" alt="Ghidra 12.1.4">
  <img src="https://img.shields.io/badge/phase-F6-blue" alt="Fase actual: F6">
  <a href="https://github.com/pablodiazjorge/rea-lab/actions/workflows/check.yml"><img src="https://github.com/pablodiazjorge/rea-lab/actions/workflows/check.yml/badge.svg" alt="Comprobaciones del repositorio"></a>
  <a href="https://github.com/pablodiazjorge/rea-lab/actions/workflows/windows-smoke.yml"><img src="https://github.com/pablodiazjorge/rea-lab/actions/workflows/windows-smoke.yml/badge.svg" alt="Prueba en Windows con Ghidra real"></a>
  <img src="https://img.shields.io/badge/code-MIT-green" alt="Licencia del código: MIT">
  <img src="https://img.shields.io/badge/text-CC_BY_4.0-green" alt="Licencia de los textos: CC BY 4.0">
</p>

<p align="center"><a href="README.md">Read in English</a></p>

## Por qué

[rea](https://github.com/morluto/rea) da a los agentes de programación (Claude Code, Codex, Cursor y otros) herramientas MCP para hacer ingeniería inversa, desde el comportamiento de una aplicación hasta sus binarios nativos. En Windows destacan tres huecos:

1. Su proveedor de Ghidra es experimental y apenas se ha verificado en equipos reales.
2. Nadie ha medido qué le aporta a un agente con binarios nativos de Windows.
3. Su evidencia vive solo en memoria, así que no se puede ver qué va encontrando el agente.

Este laboratorio trabaja en esos tres huecos: aporta verificación de Windows al proyecto original, construye un banco de pruebas reproducible con respuestas conocidas y publica un mod de Claude Code que muestra en directo la evidencia del agente.

## Hoja de ruta

No hay fechas: cada fase se cierra cuando cumple sus criterios de salida.

| Fase | Objetivo | Estado |
|---|---|---|
| F0 | Cimientos públicos: normas, decisiones y comprobaciones | hecha |
| F1 | Entorno reproducible y registro MCP por proyecto | hecha |
| F2 | Contribuciones a rea desde un Windows real | continua |
| F3 | Retos con semilla y respuesta conocida, y primeros writeups | hecha |
| F4 | Banco de pruebas y estudio 1: qué le aporta rea a un agente | hecha |
| F5 | Mod de Claude Code con un panel de evidencia en directo | hecha |
| F6 | Segunda ola de contribuciones, skill mejorada y segundo agente | prevista |
| F7 | Análisis dinámico dentro de Windows Sandbox | opcional |

## Estado

- rea 6.4.0 con Ghidra 12.1.4 en Windows 11 26H2 (x64, NTFS, usuario sin elevar): `rea doctor --provider ghidra` pasa todas las comprobaciones, incluida la autoprueba nativa que falla en otros equipos ([morluto/rea#1701](https://github.com/morluto/rea/issues/1701)).
- Primera sesión real: `WinHelloCPP.exe`, un ejercicio que trae Ghidra, analizado en unos 25 s (6 segmentos, 388 funciones y 254 cadenas), sin procesos ni archivos temporales sueltos.
- Seis contribuciones fusionadas en el proyecto original: [morluto/rea#1863](https://github.com/morluto/rea/pull/1863) arregla las pruebas reales de Ghidra en Windows; [morluto/rea#1926](https://github.com/morluto/rea/pull/1926) y [morluto/rea#1936](https://github.com/morluto/rea/pull/1936) hacen que las pruebas de los clientes Claude Code y Gemini CLI funcionen en Windows nativo; [morluto/rea#2312](https://github.com/morluto/rea/pull/2312) corrige tres suites de frontera del servidor MCP que fallaban en Windows nativo; [morluto/rea#2497](https://github.com/morluto/rea/pull/2497) documenta lo que cubre el parser de NativeAOT de rea en un Windows real, y [morluto/rea#3226](https://github.com/morluto/rea/pull/3226) corrige cómo decodifica rea un texto CBOR vacío en los metadatos de Solidity. Los cambios de otras dos, [morluto/rea#2824](https://github.com/morluto/rea/pull/2824) y [morluto/rea#2911](https://github.com/morluto/rea/pull/2911), entraron en la rama principal de rea dentro de un commit del mantenedor.
- [Estudio 1](writeups/2026-10-study-1/README.es.md), prerregistrado: con diez crackmes pequeños de Windows, rea no cambió cuántos resolvió Claude Code (28 de 30 con y sin rea), hizo cada ejecución el doble de lenta y de cara, y toda la evidencia de rea que citó el agente se volvió a autenticar.
- [Estudio 2](writeups/2026-10-study-2/README.es.md), prerregistrado: con ocho binarios más grandes, en los que la comprobación real se esconde entre decenas de señuelos, Claude Code resolvió 11 de 24 ejecuciones sin rea y 4 de 24 con rea (McNemar exacto, p = 0,092, no significativo), otra vez con el doble de tiempo y de coste; 45 de los 46 registros de evidencia citados se volvieron a autenticar.
- [rea-casebook](https://github.com/pablodiazjorge/rea-casebook) 1.0.0, un mod de Claude Code que lleva en directo el expediente de la evidencia que rea entrega al agente: la espera del arranque en frío de Ghidra, las preguntas abiertas, los hallazgos que tienen que citar `evidence_id` reales, un diario por sesión y exportaciones a Markdown o a artifact.

## Estructura

| Ruta | Contenido |
|---|---|
| `AGENTS.md` | Instrucciones para los agentes (`CLAUDE.md` lo importa) |
| `docs/adr/` | Registros de decisiones de arquitectura |
| `docs/guides/` | Guías prácticas, como el [registro MCP portátil y por proyecto](docs/guides/portable-mcp-registration.es.md) |
| `writeups/` | Investigaciones con su evidencia limpia: [WinHelloCPP](writeups/2026-10-winhellocpp/README.es.md), [Wallace v1 frente a v2](writeups/2026-10-wallace-versions/README.es.md), [c02-xor con -O0 y -O2](writeups/2026-10-own-xor/README.es.md), [estudio 1](writeups/2026-10-study-1/README.es.md), [estudio 2](writeups/2026-10-study-2/README.es.md) |
| [`challenges/`](challenges/README.es.md) | Retos de práctica con semilla y respuesta conocida, compilados de forma reproducible |
| [`bench/`](bench/README.es.md) | Banco de pruebas: ejecuciones aisladas de `claude -p`, calificadores deterministas, el propio código de evaluación de rea y estadística por pares |
| `tools.json` | Versiones, URL de descarga y SHA-256 de cada herramienta |
| `scripts/setup.mjs` | Descarga, verifica y descomprime las herramientas en `tools/` |
| `scripts/rea-mcp.mjs`, `.mcp.json` | El servidor MCP de rea, registrado solo para este proyecto |
| `.claude/settings.json` | Herramientas de rea permitidas; denegadas las que ejecutan un objetivo o un dispositivo |
| `scripts/check.mjs` | Comprobaciones del repositorio: datos personales, paridad bilingüe, enlaces y estilo |
| `env.ps1` | rea, Ghidra y clang para la sesión de PowerShell actual |
| `.github/workflows/` | CI: comprobaciones en cada push y Ghidra real en Windows cada semana |
| `tools/`, `targets/`, `repos/` | Herramientas locales, objetivos de análisis y repositorios anidados (fuera de git) |

## Inicio rápido

Requisitos: Windows 10 o posterior (x64) y Node.js 22.19 o posterior. `npm run setup` descarga Ghidra 12.1.4, el JDK 21 de Temurin y llvm-mingw (unos 920 MB), verifica cada SHA-256 antes de descomprimir y lo deja todo dentro de `tools/`: no se instala nada en el sistema.

```powershell
npm ci
npm run setup
. .\env.ps1
rea doctor --provider ghidra --json
```

Después, abre Claude Code en esta carpeta y aprueba el servidor `rea` de `.mcp.json`: el agente tendrá las herramientas de rea solo en este proyecto, sin rutas personales en la configuración. La primera consulta a Ghidra importa y analiza el binario, y tarda alrededor de medio minuto con un ejecutable pequeño.

## Objetivos y marco legal

Solo binarios compilados aquí, los ejercicios que trae Ghidra, y crackmes o retos de CTF ya cerrados cuyas normas permitan publicar soluciones. Los binarios de terceros se analizan en estático y nunca se ejecutan en el equipo; lo dinámico se hace dentro de Windows Sandbox y sin red. Quedan fuera el software comercial, los juegos en línea, el DRM y cualquier cosa relacionada con el empleador del autor. Detalles y base legal en el [ADR 0010](docs/adr/0010-target-policy.md).

## Decisiones

Cada decisión difícil de revertir tiene un registro breve en [docs/adr](docs/adr/README.md): estructura de repositorios, política de idiomas, el lanzador MCP portátil, versiones fijadas, política de objetivos, aislamiento del banco de pruebas y cómo contribuye el laboratorio a rea.

## Licencia

El código se publica con la [licencia MIT](LICENSE). Los textos (README, guías, ADR y writeups) y los resultados del banco de pruebas, con [CC BY 4.0](LICENSE-CC-BY-4.0).

## Agradecimientos

- [rea](https://github.com/morluto/rea), de morluto, con licencia MIT.
- [Ghidra](https://github.com/NationalSecurityAgency/ghidra), de la NSA, con licencia Apache 2.0.
