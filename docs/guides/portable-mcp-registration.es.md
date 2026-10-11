# Registro MCP portátil y por proyecto de rea en Windows

<p><a href="portable-mcp-registration.md">Read in English</a></p>

Cómo este laboratorio da a Claude Code las herramientas MCP de [rea](https://github.com/morluto/rea) solo en un proyecto, sin rutas personales en el repositorio y sin instalar nada en el sistema. Medido en Windows 11 26H2 con rea 6.4.0 y Ghidra 12.1.4.

## El problema

- `rea setup` registra el servidor a nivel de usuario (`~/.claude.json`), así que lo ven todos los proyectos, y escribe las rutas absolutas del equipo en el que se ejecutó.
- rea rechaza valores relativos en `GHIDRA_INSTALL_DIR` y `JAVA_HOME`, de modo que una configuración subida al repositorio no puede apuntar sin más a `tools/`.
- Poner esas variables en todo el sistema las filtraría a cualquier otra herramienta y a cualquier otro proyecto.

## La solución

| Pieza | Función |
|---|---|
| [`tools.json`](../../tools.json) | Un único manifiesto con la URL, el tamaño, el SHA-256 y la carpeta de cada herramienta |
| [`scripts/setup.mjs`](../../scripts/setup.mjs) | Descarga, verifica tamaño y huella antes de descomprimir y lo deja todo en `tools/` |
| [`scripts/rea-mcp.mjs`](../../scripts/rea-mcp.mjs) | Lanzador: construye las rutas absolutas al arrancar y ejecuta rea en el mismo proceso |
| [`.mcp.json`](../../.mcp.json) | Registro con alcance de proyecto y sin ninguna ruta absoluta |
| [`.claude/settings.json`](../../.claude/settings.json) | Permite las herramientas de rea y deniega las que ejecutan un objetivo, un navegador o un dispositivo |

El registro solo nombra el lanzador, relativo al proyecto:

```json
{
  "mcpServers": {
    "rea": {
      "type": "stdio",
      "command": "node",
      "args": ["${CLAUDE_PROJECT_DIR:-.}/scripts/rea-mcp.mjs"],
      "timeout": 600000
    }
  }
}
```

El lanzador encuentra el repositorio a partir de su propia ubicación, lee `tools.json`, fija las rutas absolutas que necesita rea y cede el control al punto de entrada de rea con el argumento `mcp`. Que rea corra en el mismo proceso importa: cuando el cliente cierra el servidor, no quedan procesos de Node ni de Java huérfanos.

```js
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
Object.assign(process.env, {
  GHIDRA_INSTALL_DIR: toolFolder('ghidra'),
  JAVA_HOME: toolFolder('jdk'),
})
process.argv = [process.argv[0], entry, 'mcp']
await import(pathToFileURL(entry).href)
```

Los diagnósticos van solo a stderr, porque stdout transporta el protocolo MCP.

## Mediciones

| Qué | Resultado |
|---|---|
| Copia nueva en otra carpeta: `npm ci` y `npm run setup` | Lista sin editar ni una ruta |
| Del arranque del lanzador a `tools/list` | De 14 a 17 s en frío, 170 herramientas |
| Primer `binary_overview` de un PE x86 de 108 KB (importación y autoanálisis de Ghidra) | 34,6 s por MCP; `open_binary` 0,8 s y `close_binary` 0,3 s |
| Cierre cuando el cliente cierra stdin | Código de salida 0, sin procesos `java` ni carpetas temporales sueltas |
| Sesión interactiva de Claude Code en el proyecto | rea cargado desde `.mcp.json` y respuesta correcta |

El `evidence_id` de ese resumen fue idéntico por la CLI y por MCP, aunque el binario estaba en carpetas distintas: la ruta local no entra en el hash de la evidencia de rea, así que se puede sustituir antes de publicarla sin romper su integridad.

## Lo que conviene saber

- La primera consulta a Ghidra hace la importación y el análisis, así que es la lenta. El `timeout` del servidor le da margen; un ejecutable pequeño queda muy por debajo de los dos minutos a partir de los cuales Claude Code pasa una llamada MCP larga a segundo plano.
- En modo sin interfaz (`claude -p`) se siguen cargando los plugins del usuario, y un servidor MCP que aporta un plugin se conecta incluso con `--strict-mcp-config`. Un banco de pruebas necesita su propia carpeta de configuración.
- Hasta que no se confía una vez en la carpeta, Claude Code ignora las entradas `permissions.allow` de `.claude/settings.json`; `--allowedTools` sigue funcionando en la línea de órdenes.
- Solo se ha probado Claude Code. Otros agentes leen los servidores MCP de sus propios archivos de configuración; el lanzador les serviría igual, pero este laboratorio no lo afirma hasta haberlo verificado.
