# Provenance

This folder is a modified copy of the `reverse-engineer-anything` skill shipped in `rea-agents@6.4.0` ([morluto/rea](https://github.com/morluto/rea)), under the MIT licence, copyright (c) 2026 morluto; the licence is in [LICENSE](LICENSE).

rea-lab changed `SKILL.md` only:

- a section, "Locate code in a native binary", on finding where a described function or table lives: anchors before code, no full procedure listing, code only for candidates, the argument names each tool's schema uses, and a confirmation whose Evidence states the reported address;
- a pointer to that section from the native route;
- one sentence on reading a result that the client saved to a file instead of repeating the call;
- the version in the front matter, `37+rea-lab.1`.

The `references/` files are unchanged. Study 5 compares this skill with the original ([ADR 0025](../../../docs/adr/0025-skill-comparison.md)). The section names only tools that rea 6.4.0 and rea's main branch both offer, with the same argument names, so it can be proposed to rea as a small addition.
