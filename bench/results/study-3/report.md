# Benchmark report: study-3

Runs: 144. Set: held-out-real. Claude Code 2.1.296, model claude-sonnet-5-5, effort medium, rea 6.4.0.

Rates show successes/runs, the estimate and its Wilson 95 % interval. Cost is the equivalent cost reported by Claude Code, not money spent.

## Outcome by condition

Correct: the answered address falls inside the target function or table. Without image base: answers given as relative addresses, counted as correct when they fall inside.

| Condition | Correct | Exact start | Without image base | Source name right | Strict manifest | Classifier stops (runs) | Refused | Timed out | Denied commands | Median time | Median turns | Median input tokens | Median output tokens | Median cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 71/72 (99 %, 93 %-100 %) | 71/72 (99 %, 93 %-100 %) | 0 | 1/72 (1 %, 0 %-7 %) | 68/72 (94 %, 87 %-98 %) | 0 | 0 | 0 | 40 | 27 s | 10 | 112967 | 1622 | 0.08 USD |
| B | 68/72 (94 %, 87 %-98 %) | 68/72 (94 %, 87 %-98 %) | 0 | 1/72 (1 %, 0 %-7 %) | 71/72 (99 %, 93 %-100 %) | 0 | 0 | 0 | 32 | 74 s | 14 | 300695 | 1805 | 0.19 USD |

## Correct by family

| Family | A | B | C |
|---|---|---|---|
| string | 12/12 (100 %, 76 %-100 %) | 12/12 (100 %, 76 %-100 %) | n/a |
| behaviour | 39/39 (100 %, 91 %-100 %) | 36/39 (92 %, 80 %-97 %) | n/a |
| chain | 11/12 (92 %, 65 %-99 %) | 11/12 (92 %, 65 %-99 %) | n/a |
| data | 9/9 (100 %, 70 %-100 %) | 9/9 (100 %, 70 %-100 %) | n/a |

## Correct by program

| Program | A | B | C |
|---|---|---|---|
| sgiemu | 18/18 (100 %, 82 %-100 %) | 17/18 (94 %, 74 %-99 %) | n/a |
| c5xtools | 18/18 (100 %, 82 %-100 %) | 17/18 (94 %, 74 %-99 %) | n/a |
| moppe-emu | 18/18 (100 %, 82 %-100 %) | 16/18 (89 %, 67 %-97 %) | n/a |
| flint | 17/18 (94 %, 74 %-99 %) | 18/18 (100 %, 82 %-100 %) | n/a |

## Paired comparisons (exact McNemar)

| Pair | Pairs | Only first correct | Only second correct | p-value |
|---|---|---|---|---|
| A vs B | 72 | 4 | 1 | 0.3750 |
| A vs B, without the string control | 60 | 4 | 1 | 0.3750 |
| A vs B, one pair per task (right in at least half of its repetitions), without the control | 20 | 1 | 0 | 1.0000 |

## rea usage and Evidence (conditions B and C)

| Condition | Used rea | First call open_binary | Opened and closed | Repeated calls | Input validation failures | Citations authenticated | Citations about the target | Invented ids | Skill loaded |
|---|---|---|---|---|---|---|---|---|---|
| B | 72/72 (100 %, 95 %-100 %) | 72/72 (100 %, 95 %-100 %) | 71/72 (99 %, 93 %-100 %) | 0 | 5 | 144/144 | 144/144 | 0 | 0/72 (0 %, 0 %-5 %) |

## Answered address in the cited Evidence (conditions B and C)

Runs whose answer_address cites an authenticated Evidence that states that same address, absolute or relative to the image base. The answer is still graded against the ground truth, not against the Evidence.

| Condition | Runs with an address | Address in the cited Evidence | Of those, correct |
|---|---|---|---|
| B | 72 | 38 | 37 |

## Runs flagged for review

- r03-x64-O2-strip-B-r3: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-3/r03-x64-O2-strip-B-r3/claude-config/projects/"*/*/tool-results/ && python -I -c "
import json
d=json.load(open('mcp-rea-list_procedures-1791997858406.txt'))
r=d['normalized_result']
print(len(r)); print(r[:3])"`
- r05-x64-O2-strip-A-r2: execution attempts `cat > /tmp/f.py <<'E'
import re,collections
L=open('d.txt').read().split('\n')
starts=[];prev=False
for l in L:
    m=re.match(r'([0-9a-f]+):\s+(.*)',l)
    if not m: continue
    if prev and 'int3' not in m.group(2): starts.append(int(m.group(1),16))
    prev='int3' in m.group(2)
calls=collections.defaultdict(list)
import bisect
for l in L:
    m=re.match(r'([0-9a-f]+):\s+(?:callq|jmp)\s+0x([0-9a-f]+)',l)
    if m and 'callq' in l:
        a=int(m.group(1),16);t=int(m.group(2),16)
        f=starts[bisect.bisect(starts,a)-1]
        calls[t].append(f)
for s in starts:
    if 0x14000e000<=s<0x140016000 and len(calls[s])==1:
        print(hex(s),hex(calls[s][0]))
E
python -I /tmp/f.py`
- r08-x64-O2-strip-B-r1: outside paths `~/../../../../../../../../../tmp/m.txt`, `Bash: parent folder`
- r10-x64-O2-strip-B-r3: execution attempts `python -I -c "
import json,sys
d=json.load(open(r'<home>\AppData\Local\rea-lab-bench\runs\study-3\r10-x64-O2-strip-B-r3\claude-config\projects\<home>-AppData-Local-rea-lab-bench-runs-study-3-r10-x64-O2-strip-B-r3-work\12234558-bae3-48c7-a50d-a18dc1193343\tool-results\mcp-rea-procedure_pseudo_code-1792001281896.txt'))
v=d['raw_result']['value']
print(len(v)); print(v[:3500])"`
- r11-x64-O2-strip-B-r2: outside paths `a:/,\$p`
- r12-x64-O2-strip-B-r2: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-3/r12-x64-O2-strip-B-r2/claude-config/projects/<home>-AppData-Local-rea-lab-bench-runs-study-3-r12-x64-O2-strip-B-r2-work/e4d18f78-68b5-4ea0-b1fa-c5d074ce3dfd/tool-results/" && python -I -c "
import json,sys
d=json.load(open('mcp-rea-list_strings-1792000332045.txt'))
for r in d['raw_result'][:400]:
    if len(r['value'])>3: print(r['address'],r['value'][:70])
" | head -200`
- r14-x64-O2-strip-A-r1: outside paths `f:/`, `c:/`, `e:/`
- r14-x64-O2-strip-A-r2: outside paths `f:/`
- r14-x64-O2-strip-A-r3: execution attempts `cd . ; python -I -c "
import struct
d=open('target.exe','rb').read()
import re
o=d.find(b'.pdata')
" ; llvm-readobj --unwind-info target.exe 2>/dev/null | grep -E "StartAddress|EndAddress" | paste - - | awk '{print $2,$4}' | head -70`
- r14-x64-O2-strip-B-r1: execution attempts `python -I -c "
import json
d=json.load(open(r'<home>\AppData\Local\rea-lab-bench\runs\study-3\r14-x64-O2-strip-B-r1\claude-config\projects\<home>-AppData-Local-rea-lab-bench-runs-study-3-r14-x64-O2-strip-B-r1-work\dfc089d6-7dbf-4e26-aa11-b6108ddb2f72\tool-results\mcp-rea-list_procedures-1791996897273.txt'))
r=d['normalized_result']
print(len(r));print(r[:3])
" `
- r15-x64-O2-strip-B-r1: outside paths `<home>/AppData/Local/rea-lab-bench/runs/study-3/r15-x64-O2-strip-B-r1/`
- r17-x64-O2-strip-A-r1: execution attempts `grep -oE "call[q]?\s+0x[0-9a-f]+" d.txt | awk '{print $2}' | sort -u > t.txt; wc -l t.txt; sort t.txt | awk '{printf "%s\n",$1}' | python -c "
import sys
a=sorted(int(x,16) for x in sys.stdin.read().split())
g=sorted(((a[i+1]-a[i],hex(a[i])) for i in range(len(a)-1)),reverse=True)[:8]
print(g)"`
- r17-x64-O2-strip-A-r3: execution attempts `llvm-objdump -s -j .pdata target.exe | tail -n +4 | python -I -c "
import sys,struct
d=bytearray()
for l in sys.stdin:
    p=l.split()
    if len(p)<2: continue
    for x in p[1:5]: d+=bytes.fromhex(x)
for i in range(0,len(d)-11,12):
    b,e,u=struct.unpack('<III',d[i:i+12])
    if e-b>600: print(hex(b+0x140000000),e-b)
"`
- r17-x64-O2-strip-B-r2: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-3/r17-x64-O2-strip-B-r2/claude-config/projects/<home>-AppData-Local-rea-lab-bench-runs-study-3-r17-x64-O2-strip-B-r2-work/5ca2a475-e972-4f3b-8dd1-05b0b574b995/tool-results/"; python -c "
import json,sys
d=json.load(open('mcp-rea-list_procedures-1791994906878.txt'))
r=d['normalized_result']
print(type(r),len(r)); print(json.dumps(r)[:600])
"`
- r18-x64-O2-strip-A-r1: execution attempts `llvm-readobj --sections target.exe | grep -E "PointerToRawData|Name:" | head -12; od -An -tx1 -v -j 0x1200 -N 0x2200 target.exe | head -0; python -I -c "
d=open('target.exe','rb').read()
import re
# find ascii-ordered pair tables: search for 0x30 pattern preceded by 0x2f
for m in re.finditer(rb'\x30\x00',d): pass
print(len(d))
"`
- r19-x64-O2-strip-A-r1: execution attempts `python -I -c "
import struct
d=open('target.exe','rb').read()
# pdata raw: find section
import re
pe=struct.unpack_from('<I',d,0x3c)[0]
n=struct.unpack_from('<H',d,pe+6)[0];so=struct.unpack_from('<H',d,pe+20)[0]
o=pe+24+so
for i in range(n):
    nm=d[o+i*40:o+i*40+8];vs,va,rs,rp=struct.unpack_from('<IIII',d,o+i*40+8)
    if nm.startswith(b'.pdata'):
        for j in range(0,vs,12):
            b,e,u=struct.unpack_from('<III',d,rp+j)
            if b<=0x20928<e: print(hex(b+0x140000000),hex(e+0x140000000),hex(u))
"`
- r20-x64-O2-strip-A-r1: execution attempts `llvm-strings -n 5 target.exe | grep -iE "lua|compil|python|mruby|opcode|\.c$|\.cpp|gcc|mingw" | head -30`
- r20-x64-O2-strip-A-r2: execution attempts `ls -la; llvm-readobj --file-headers target.exe | grep -E "ImageBase|EntryPoint|Machine"; llvm-strings -a target.exe | grep -iE "lua|python|ruby|javascript|mozilla|rhino|squirrel|gravity" | head -20`
- r20-x64-O2-strip-A-r3: execution attempts `llvm-strings -n 5 target.exe | grep -iE "ldc|const|lua|python|opcode|compil|usage|\.c$|\.cpp|\.py" | head -50; llvm-objdump -d --no-show-raw-insn target.exe > dis.txt; wc -l dis.txt`
- r22-x64-O2-strip-A-r1: execution attempts `llvm-strings -a target.exe | grep -i -E "mruby|quickjs|duktape|wren|gravity|squirrel|python|ruby|version|usage" | head -20`, `grep -n "call.*140042890" dis.txt | wc -l; grep -n "call.*140042890" dis.txt | awk -F: '{print $1}' > cl.txt; python3 -I - <<'E'
import re,bisect
L=open('dis.txt').read().split('\n')
# function starts: after ret/int3 heuristics - use pdata instead
E
llvm-objdump -s -j .pdata target.exe | head -3`
- r22-x64-O2-strip-A-r2: execution attempts `llvm-strings -a target.exe | grep -i -E "lua|not enough memory|mruby|ruby|python" | head -20; llvm-readobj --file-headers --sections target.exe | grep -E "ImageBase|Name:|VirtualSize|VirtualAddress" | head -30`
- r22-x64-O2-strip-A-r3: execution attempts `llvm-strings -a target.exe | grep -i -E "lua|gc|ruby|python|mrb" | head -30; llvm-readobj --file-headers target.exe | grep -E "ImageBase|EntryPoint"`
- r23-x64-O2-strip-A-r1: execution attempts `llvm-strings -a target.exe | grep -i -E "python|lua|module|__all__|\.rs|\.go" | head -30; llvm-readobj --file-headers target.exe | grep -E "ImageBase|EntryPoint"; llvm-objdump -h target.exe | head -20`, `cat > an.py <<'E'
import re,sys
L=open('d.txt').read().split('\n')
# function starts: from pdata via call targets
ins=[]
for l in L:
    m=re.match(r'\s*([0-9a-f]{9}):\s*(.*)',l)
    if m: ins.append((int(m.group(1),16),m.group(2)))
tg=set()
for a,t in ins:
    m=re.match(r'(?:callq|jmp)\s+0x([0-9a-f]+)',t)
    if m: tg.add(int(m.group(1),16))
starts=sorted(x for x in tg if 0x140001000<=x<0x140043000)
import bisect
cnt={}
for a,t in ins:
    if 'callq	0x1400429c0' in t:
        i=bisect.bisect_right(starts,a)-1
        cnt.setdefault(starts[i],[]).append(a)
nxt={s:(starts[starts.index(s)+1]) for s in cnt}
for s,v in cnt.items(): print(hex(s),hex(nxt[s]-s),len(v))
E
python -I an.py`
- r23-x64-O2-strip-A-r2: execution attempts `llvm-objdump -d --no-show-raw-insn target.exe > dis.txt; wc -l dis.txt; llvm-readobj --file-headers target.exe | grep -E "ImageBase|EntryPoint"; llvm-strings target.exe | grep -iE "python|lua|module|member" | head -30`, `grep -n "0x140042960" dis.txt | wc -l; grep -n "call.*0x140042960" dis.txt | awk -F: '{print $1}' > /tmp/l.txt 2>/dev/null || true; python -I - <<'E'
import re
L=open('dis.txt').read().split('\n')
starts=[]
fn=None
# function starts by pdata is better; approximate by prologue: find call lines, print preceding 'sub rsp' region start
calls=[i for i,l in enumerate(L) if 'callq' in l and '0x140042960' in l]
print(len(calls))
for i in calls:
    j=i
    while j>0 and not (L[j].split(':')[0].strip().endswith('0') and 'pushq' in L[j] ) : j-=1
    print(L[i].split(':')[0], 'near start', L[j].split(':')[0])
E`
- r23-x64-O2-strip-A-r3: execution attempts `llvm-objdump -s -j .rdata target.exe | head -0; python3 -I - <<'E'
import re
d=open('d.txt').read().split('\n')
# split functions by call targets: collect call targets count
from collections import Counter
c=Counter()
for l in d:
    m=re.search(r'\bcall\s+0x([0-9a-f]+)',l)
    if m:c[m.group(1)]+=1
single=[k for k,v in c.items() if v==1]
print(len(c),len(single))
open('single.txt','w').write('\n'.join(single))
E`
- r24-x64-O2-strip-A-r2: execution attempts `cd . && python -I -c "
import struct,sys
d=open('target.exe','rb').read()
pat=struct.pack('<II',0x428a2f98,0x71374491)
i=-1
while True:
    i=d.find(pat,i+1)
    if i<0:break
    print('off',hex(i))
pe=struct.unpack_from('<I',d,0x3c)[0]
n=struct.unpack_from('<H',d,pe+6)[0];os=struct.unpack_from('<H',d,pe+20)[0]
ib=struct.unpack_from('<Q',d,pe+24+24)[0];print(hex(ib))
for k in range(n):
    o=pe+24+os+k*40
    nm=d[o:o+8];vs,va,rs,rp=struct.unpack_from('<IIII',d,o+8);print(nm,hex(va),hex(vs),hex(rp),hex(rs))
"`
- r24-x64-O2-strip-A-r3: execution attempts `cd . && python -I -c "
import sys
d=open('target.exe','rb').read()
import re
for m in re.finditer(re.escape(bytes.fromhex('982f8a4291443771')),d):print(hex(m.start()))
print(len(d))
"; llvm-readobj --file-headers --sections target.exe | grep -E "ImageBase|Name:|VirtualAddress|RawDataSize|PointerToRawData|VirtualSize"`
- r24-x64-O2-strip-B-r2: execution attempts `python -I -c "
d=open('target.exe','rb').read()
import re
for m in re.finditer(re.escape(bytes.fromhex('982f8a4291443771')),d):print(hex(m.start()))"`
