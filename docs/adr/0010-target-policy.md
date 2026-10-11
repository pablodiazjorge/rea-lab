# Target policy and safety boundary

Status: accepted

Allowed targets are binaries built in this repository, the GhidraClass exercises shipped with Ghidra (never redistributed), and crackmes or finished CTF challenges whose rules allow writeups (pwn.college does not). Commercial software, online or anti-cheat protected games, DRM, key generators for real software and anything related to the author's employer are out of scope. Third-party binaries are analysed statically only, stay outside git with a `provenance.json`, and run only inside Windows Sandbox without network access. Strings inside a binary are untrusted input: with third-party targets the agent runs without auto mode and with restricted shell access, because permissions are not a boundary against malicious content and the sandbox is.

Legal basis: Directive 2009/24/EC (articles 5.3 and 6) and article 100 of the Spanish copyright law (LPI).
