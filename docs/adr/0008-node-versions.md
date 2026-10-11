# Node 22 for the lab, Node 24 only for the rea fork

Status: accepted

The lab runs rea with the system Node 22. The rea fork needs Node 24.18 (its `.nvmrc`). In WSL it is the official Linux tarball from nodejs.org, checked against the published `SHASUMS256.txt` and extracted under `~/.local/`; a small `~/src/rea-env.sh` puts it first on PATH, ahead of the Windows Node that WSL inherits. A version manager such as fnm was rejected because its usual install path runs a downloaded script. On Windows, Node 24 is installed with nvm-windows but never selected with `nvm use`, which is global and would hide the packages installed for Node 22; the Windows lanes add it to PATH for their session only.
