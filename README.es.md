<h1 align="center">rea-lab</h1>

<p align="center">
  Ingeniería inversa con agentes de IA en Windows: verificar, medir y hacer visibles las herramientas que usan los agentes, con rea y Ghidra
</p>

<p align="center">
  <img src="https://img.shields.io/badge/rea-6.4.0-6f42c1" alt="rea 6.4.0">
  <img src="https://img.shields.io/badge/Ghidra-12.1.4-d32f2f" alt="Ghidra 12.1.4">
  <img src="https://img.shields.io/badge/phase-F0-blue" alt="Fase actual: F0">
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
| F0 | Cimientos públicos: normas, decisiones y comprobaciones | en curso |
| F1 | Entorno reproducible y registro MCP por proyecto | siguiente |
| F2 | Contribuciones a rea desde un Windows real | continua |
| F3 | Retos con semilla y respuesta conocida, y primeros writeups | prevista |
| F4 | Banco de pruebas y estudio 1: qué le aporta rea a un agente | prevista |
| F5 | Mod de Claude Code con un panel de evidencia en directo | prevista |
| F6 | Segunda ola de contribuciones, skill mejorada y segundo agente | prevista |
| F7 | Análisis dinámico dentro de Windows Sandbox | opcional |

## Estado

- rea 6.4.0 con Ghidra 12.1.4 en Windows 11 26H2 (x64, NTFS, usuario sin elevar): `rea doctor --provider ghidra` pasa todas las comprobaciones, incluida la autoprueba nativa que falla en otros equipos ([morluto/rea#1701](https://github.com/morluto/rea/issues/1701)).
- Primera sesión real: `WinHelloCPP.exe`, un ejercicio que trae Ghidra, analizado en unos 25 s (6 segmentos, 388 funciones y 254 cadenas), sin procesos ni archivos temporales sueltos.

## Estructura

| Ruta | Contenido |
|---|---|
| `AGENTS.md` | Instrucciones para los agentes (`CLAUDE.md` lo importa) |
| `docs/adr/` | Registros de decisiones de arquitectura |
| `scripts/check.mjs` | Comprobaciones del repositorio: datos personales, paridad bilingüe, enlaces y estilo |
| `env.ps1` | Variables de rea y Ghidra para la sesión de PowerShell actual |
| `tools/`, `targets/`, `repos/` | Herramientas locales, objetivos de análisis y repositorios anidados (fuera de git) |

## Inicio rápido

La preparación es manual hasta que F1 añada `scripts/setup.mjs`, que descargará y verificará cada herramienta.

Requisitos: Windows 10 o posterior (x64), Node.js 22.19 o posterior, un JDK de 64 bits 21 o posterior y [Ghidra 12.1.4](https://github.com/NationalSecurityAgency/ghidra/releases) descomprimido en `tools/ghidra_12.1.4_PUBLIC`.

```powershell
npm ci
. .\env.ps1
rea doctor --provider ghidra --json
```

## Objetivos y marco legal

Solo binarios compilados aquí, los ejercicios que trae Ghidra, y crackmes o retos de CTF ya cerrados cuyas normas permitan publicar soluciones. Los binarios de terceros se analizan en estático y nunca se ejecutan en el equipo; lo dinámico se hace dentro de Windows Sandbox y sin red. Quedan fuera el software comercial, los juegos en línea, el DRM y cualquier cosa relacionada con el empleador del autor. Detalles y base legal en el [ADR 0010](docs/adr/0010-target-policy.md).

## Decisiones

Cada decisión difícil de revertir tiene un registro breve en [docs/adr](docs/adr/README.md): estructura de repositorios, política de idiomas, el lanzador MCP portátil, versiones fijadas, política de objetivos, aislamiento del banco de pruebas y cómo contribuye el laboratorio a rea.

## Licencia

El código se publica con la [licencia MIT](LICENSE). Los textos (README, guías, ADR y writeups) y los resultados del banco de pruebas, con [CC BY 4.0](LICENSE-CC-BY-4.0).

## Agradecimientos

- [rea](https://github.com/morluto/rea), de morluto, con licencia MIT.
- [Ghidra](https://github.com/NationalSecurityAgency/ghidra), de la NSA, con licencia Apache 2.0.
