# Target policy and safety boundary

Status: accepted, amended for study 3 and for the legal basis

Allowed targets are binaries built in this repository, the GhidraClass exercises shipped with Ghidra (the binaries are never redistributed), and crackmes or finished CTF challenges whose author or rules allow analysis and published writeups (pwn.college does not). Commercial software, online or anti-cheat protected games, DRM, key generators for real software and anything related to my employer are out of scope. Third-party binaries are analysed statically only, stay outside git with a `provenance.json`, and run only inside Windows Sandbox without network access. Strings inside a binary are untrusted input: with third-party targets the agent runs without auto mode and with restricted shell access, because permissions are not a boundary against malicious content and the sandbox is.

Legal basis: each target's own licence or the permission of its rights holder.

- Challenges and fixtures written here are original work of this repository, under its MIT License.
- The GhidraClass exercises are under the Apache License 2.0 that Ghidra ships them with. Their decompiled excerpts and evidence files are published under that licence, with a copy in `LICENSE-Apache-2.0`.
- The open-source programs of studies 3 to 5 are under MIT and similar licences, which allow copying, modifying and publishing them, decompiled excerpts included, with attribution.
- A third-party crackme or CTF challenge is used only when its author or rules allow published writeups, and decompiled code from it is quoted only as briefly as the analysis requires, naming the source and its author, relying first on that permission and only secondarily on the quotation right of article 32.1 of the Spanish copyright law (TRLPI).

Articles 5.3 and 6 of Directive 2009/24/EC (articles 100.3 and 100.5 TRLPI) let a lawful user observe and study a program, and decompile it only for interoperability. They are not relied on to decompile a target or to publish decompiled code.

Amended for study 3: open-source projects compiled here from pinned, hash-verified source archives ([ADR 0024](0024-real-software-tasks.md)) count as binaries built in this repository. What is downloaded is source text under a free licence, not a third-party executable, so the rules for third-party binaries do not apply to them. The archives stay out of git, and the strings in the resulting binaries are still untrusted input.
