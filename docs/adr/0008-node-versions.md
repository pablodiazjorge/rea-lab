# Node 22 for the lab, Node 24 only for the rea fork

Status: accepted

The lab runs rea with the system Node 22. The rea fork needs Node 24.18 (its `.nvmrc`): in WSL it is managed with fnm, and on Windows it is installed with nvm-windows but never selected with `nvm use`, which is global and would hide the packages installed for Node 22. The Windows lanes add it to PATH for their session only.
