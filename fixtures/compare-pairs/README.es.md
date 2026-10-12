# Pares para comparar funciones

<p><a href="README.md">Read in English</a></p>

Pares de PE reproducibles para `compare_functions` de rea, ofrecidos en [morluto/rea#1947](https://github.com/morluto/rea/issues/1947): un programa pequeño en C, [`pair.c`](pair.c), compilado en tres variantes.

| Variante | Qué cambia respecto a `base` |
|---|---|
| `base` | Nada: es la compilación de referencia |
| `reloc` | Solo la disposición: una función y una cadena de más van primero, así que `unchanged`, `changed_constant` y `changed_call` pasan a otras direcciones con el mismo código |
| `change` | El mismo desplazamiento, más dos cambios reales: `changed_constant` comprueba `% 4` en lugar de `% 3`, y `changed_call` llama a otra función auxiliar |

Una comparación que normalice las direcciones debería dar las tres funciones sin cambios entre `base` y `reloc`, y solo `changed_constant` y `changed_call` como cambiadas entre `base` y `change`.

```powershell
node fixtures/compare-pairs/build.mjs
```

Los binarios quedan en `build/compare-pairs/<arquitectura>-<optimización>/` (x64 y x86, `-O0` y `-O2`, sin símbolos), con todos los SHA-256 en `manifest.json`. Usan las mismas opciones reproducibles de llvm-mingw que los [retos](../../challenges/README.es.md), así que las huellas coinciden en cualquier equipo.
