# Benchmark report: study-4

Runs: 40. Set: held-out-real. Claude Code 2.1.296, model deepseek-flash served by DeepSeek, effort medium, rea 6.4.0.

Rates show successes/runs, the estimate and its Wilson 95 % interval. Cost is computed from each run's token usage at DeepSeek's published prices, peak or off-peak by the run's start (bench/prices.ts): money spent, not Claude Code's equivalent cost.

## Outcome by condition

Correct: the answered address falls inside the target function or table. Without image base: answers given as relative addresses, counted as correct when they fall inside.

| Condition | Correct | Exact start | Without image base | Source name right | Strict manifest | Classifier stops (runs) | Refused | Timed out | Denied commands | Median time | Median turns | Median input tokens | Median output tokens | Median cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 20/20 (100 %, 84 %-100 %) | 20/20 (100 %, 84 %-100 %) | 0 | 3/20 (15 %, 5 %-36 %) | 14/20 (70 %, 48 %-85 %) | 0 | 0 | 0 | 92 | 272 s | 37.5 | 1393104 | 42514 | 0.04 USD |
| B | 19/20 (95 %, 76 %-99 %) | 19/20 (95 %, 76 %-99 %) | 0 | 2/20 (10 %, 3 %-30 %) | 20/20 (100 %, 84 %-100 %) | 0 | 0 | 0 | 63 | 332 s | 54 | 2008207 | 43448 | 0.05 USD |

## Correct by family

| Family | A | B | C |
|---|---|---|---|
| behaviour | 13/13 (100 %, 77 %-100 %) | 12/13 (92 %, 67 %-99 %) | n/a |
| chain | 4/4 (100 %, 51 %-100 %) | 4/4 (100 %, 51 %-100 %) | n/a |
| data | 3/3 (100 %, 44 %-100 %) | 3/3 (100 %, 44 %-100 %) | n/a |

## Correct by program

| Program | A | B | C |
|---|---|---|---|
| sgiemu | 5/5 (100 %, 57 %-100 %) | 5/5 (100 %, 57 %-100 %) | n/a |
| c5xtools | 5/5 (100 %, 57 %-100 %) | 5/5 (100 %, 57 %-100 %) | n/a |
| moppe-emu | 5/5 (100 %, 57 %-100 %) | 4/5 (80 %, 38 %-96 %) | n/a |
| flint | 5/5 (100 %, 57 %-100 %) | 5/5 (100 %, 57 %-100 %) | n/a |

## Paired comparisons (exact McNemar)

| Pair | Pairs | Only first correct | Only second correct | p-value |
|---|---|---|---|---|
| A vs B | 20 | 1 | 0 | 1.0000 |
| A vs B, without the string control | 20 | 1 | 0 | 1.0000 |
| A vs B, one pair per task (right in at least half of its repetitions), without the control | 20 | 1 | 0 | 1.0000 |

## Per task, compared with study-3

Correct runs out of all runs, per condition, here and in study-3, on the 20 tasks both studies ran.

| Task | Family | Program | A | B | A in study-3 | B in study-3 |
|---|---|---|---|---|---|---|
| r02 | behaviour | sgiemu | 1/1 | 1/1 | 3/3 | 3/3 |
| r03 | behaviour | sgiemu | 1/1 | 1/1 | 3/3 | 3/3 |
| r04 | behaviour | sgiemu | 1/1 | 1/1 | 3/3 | 3/3 |
| r05 | chain | sgiemu | 1/1 | 1/1 | 3/3 | 2/3 |
| r06 | data | sgiemu | 1/1 | 1/1 | 3/3 | 3/3 |
| r08 | behaviour | c5xtools | 1/1 | 1/1 | 3/3 | 3/3 |
| r09 | behaviour | c5xtools | 1/1 | 1/1 | 3/3 | 3/3 |
| r10 | behaviour | c5xtools | 1/1 | 1/1 | 3/3 | 2/3 |
| r11 | behaviour | c5xtools | 1/1 | 1/1 | 3/3 | 3/3 |
| r12 | chain | c5xtools | 1/1 | 1/1 | 3/3 | 3/3 |
| r14 | behaviour | moppe-emu | 1/1 | 0/1 | 3/3 | 3/3 |
| r15 | behaviour | moppe-emu | 1/1 | 1/1 | 3/3 | 1/3 |
| r16 | behaviour | moppe-emu | 1/1 | 1/1 | 3/3 | 3/3 |
| r17 | chain | moppe-emu | 1/1 | 1/1 | 3/3 | 3/3 |
| r18 | data | moppe-emu | 1/1 | 1/1 | 3/3 | 3/3 |
| r20 | behaviour | flint | 1/1 | 1/1 | 3/3 | 3/3 |
| r21 | behaviour | flint | 1/1 | 1/1 | 3/3 | 3/3 |
| r22 | behaviour | flint | 1/1 | 1/1 | 3/3 | 3/3 |
| r23 | chain | flint | 1/1 | 1/1 | 2/3 | 3/3 |
| r24 | data | flint | 1/1 | 1/1 | 3/3 | 3/3 |
| All | | | 20/20 | 19/20 | 59/60 | 56/60 |

## rea usage and Evidence (conditions B and C)

| Condition | Used rea | First call open_binary | Opened and closed | Repeated calls | Input validation failures | Citations authenticated | Citations about the target | Invented ids | Skill loaded |
|---|---|---|---|---|---|---|---|---|---|
| B | 20/20 (100 %, 84 %-100 %) | 20/20 (100 %, 84 %-100 %) | 20/20 (100 %, 84 %-100 %) | 6 | 2 | 40/40 | 40/40 | 0 | 0/20 (0 %, 0 %-16 %) |

## Answered address in the cited Evidence (conditions B and C)

Runs whose answer_address cites an authenticated Evidence that states that same address, absolute or relative to the image base. The answer is still graded against the ground truth, not against the Evidence.

| Condition | Runs with an address | Address in the cited Evidence | Of those, correct |
|---|---|---|---|
| B | 20 | 18 | 17 |

## Runs flagged for review

- r02-x64-O2-strip-A-r1: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-4/r02-x64-O2-strip-A-r1/work"; python - <<'EOF'
import struct
data=open('target.exe','rb').read()
# sections
secs=[('.text',0x1000,0x400,0x24186),('.rdata',0x26000,0x24600,0x5208),('.data',0x2d000,0x29c00,0x200),('.pdata',0x5fd000,0x29e00,0x7a4),('.reloc',0x5fe000,0x29f00,0x5c)]
base=0x140000000
for name,va,raw,sz in secs:
    print(name, hex(base+va), hex(raw), sz)
# find strings
for s in [b'R4K_JIT_NOREGS', b'R4K_JIT_NOFPU', b'Out of memory for the JIT', b'ip24prom.bin']:
    i=data.find(s)
    while i!=-1:
        # convert file offset to va
        for name,va,raw,sz in secs:
            if raw<=i<raw+sz:
                print(s, hex(base+va+(i-raw)), name)
        i=data.find(s,i+1)
EOF`
- r02-x64-O2-strip-B-r1: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-4/r02-x64-O2-strip-B-r1/work" && python -I -c "
import json,sys
p=r'<home>\AppData\Local\rea-lab-bench\runs\study-4\r02-x64-O2-strip-B-r1\claude-config\projects\<home>-AppData-Local-rea-lab-bench-runs-study-4-r02-x64-O2-strip-B-r1-work\86c883f9-b208-496a-b4b3-f5cf2e08ca08\tool-results\call_00_kfvF24RreBl1jrFkUOCt7741.txt'
d=json.load(open(p,encoding='utf-8'))
for a in d['raw_result']:
    print(a['address'], repr(a['value']))
" 2>&1 | head -300`
- r03-x64-O2-strip-A-r1: execution attempts `python -c "print('py ok')" 2>&1; python3 -c "print('py3 ok')" 2>&1`; outside paths `<home>\AppData\Local\rea-lab-bench\runs\study-4\r03-x64-O2-strip-A-r1`, `<home>\AppData\Local\rea-lab-bench\runs\study-4`, `<home>\AppData\Local\rea-lab-bench`
- r03-x64-O2-strip-B-r1: execution attempts `python --version 2>&1; python3 --version 2>&1`, `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r03-x64-O2-strip-B-r1\work" && python -I -c "
import json
p=r'<home>\AppData\Local\rea-lab-bench\runs\study-4\r03-x64-O2-strip-B-r1\claude-config\projects\<home>-AppData-Local-rea-lab-bench-runs-study-4-r03-x64-O2-strip-B-r1-work\b71b7f4d-5089-452b-b8c5-c7e4aef1dd48\tool-results\mcp-rea-list_procedures-1792164064126.txt'
d=json.load(open(p))
r=d['raw_result']
print(len(r))
print(json.dumps(r[0],indent=1)[:500])
"`, `python -c "print(1+1)"`; outside paths `f:\`
- r04-x64-O2-strip-B-r1: outside paths `<home>\AppData\Local\rea-lab-bench\runs\study-4\r04-x64-O2-strip-B-r1`, `<home>\AppData\Local\rea-lab-bench\runs\study-4`, `<home>\AppData\Local\rea-lab-bench\runs`, `<home>\AppData\Local\rea-lab-bench`
- r05-x64-O2-strip-A-r1: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-4/r05-x64-O2-strip-A-r1/work" && which python python3 2>&1; python --version 2>&1`, `cd "<home>/AppData/Local/rea-lab-bench/runs/study-4/r05-x64-O2-strip-A-r1/work" && llvm-readobj --unwind target.exe | grep -E "StartAddress" | sed 's/[^0-9A-F]//g' > starts.txt && wc -l starts.txt && cat > analyze.py <<'EOF'
import re, collections
starts=[]
for line in open('starts.txt'):
    line=line.strip()
    if not line: continue
    starts.append(int(line,16))
starts=sorted(set(starts))
text_end=0x140025186

lines=open('dis.txt').read().splitlines()
insns=[]
pat=re.compile(r'^\s*([0-9a-f]+):\s+(\S+)\s*(.*)$')
for l in lines:
    m=pat.match(l)
    if m:
        insns.append((int(m.group(1),16), m.group(2), m.group(3).strip()))

# function start lookup
sorted_starts=starts
def owner(addr):
    # largest start <= addr
    import bisect
    i=bisect.bisect_right(sorted_starts,addr)-1
    if i<0: return None
    return sorted_starts[i]

callers=collections.defaultdict(set)
callcount=collections.Counter()
calletotal=collections.Counter()
for a,mn,ops in insns:
    if mn in ('callq','call'):
        t=re.search(r'^\$?(0x[0-9a-f]+)', ops)
        # direct call form: callq 0x14000abcd
        m2=re.match(r'^(0x[0-9a-f]+)', ops)
        if m2:
            tgt=int(m2.group(1),16)
            o=owner(a)
            callers[tgt].add(o)
            callcount[tgt]+=1
            calletotal[(o,tgt)]+=1
print("total funcs:",len(starts))
# print functions with exactly 1 call site
single=[t for t in callers if callcount[t]==1]
print("callees with exactly 1 call site:",len(single))
for t in sorted(single):
    print(hex(t), "caller",hex(callers[t].copy().pop() if callers[t] else 0))
EOF
python -I analyze.py | head -100`, `cd "<home>/AppData/Local/rea-lab-bench/runs/study-4/r05-x64-O2-strip-A-r1/work" && python -I -c "print('hello',2+2)"`
- r05-x64-O2-strip-B-r1: execution attempts `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r05-x64-O2-strip-B-r1\work" && python -I -c "
import json
p=r'<home>\AppData\Local\rea-lab-bench\runs\study-4\r05-x64-O2-strip-B-r1\claude-config\projects\<home>-AppData-Local-rea-lab-bench-runs-study-4-r05-x64-O2-strip-B-r1-work\9c9effeb-e71c-4181-8a49-16e0f6fe5c84\tool-results\mcp-rea-list_procedures-1792160703511.txt'
d=json.load(open(p))
r=d['raw_result']
print('n=',len(r))
print('sample=',r[:5])
"`
- r06-x64-O2-strip-B-r1: outside paths `Bash: parent folder`, `<home>\AppData\Local\rea-lab-bench\runs\study-4\r06-x64-O2-strip-B-r1`
- r08-x64-O2-strip-A-r1: outside paths `s://raw.githubusercontent.com`
- r08-x64-O2-strip-B-r1: execution attempts `python -c "
import json,re
p=r'<home>\AppData\Local\rea-lab-bench\runs\study-4\r08-x64-O2-strip-B-r1\claude-config\projects\<home>-AppData-Local-rea-lab-bench-runs-study-4-r08-x64-O2-strip-B-r1-work\e8c0875d-b546-48a6-ab90-3162346535b1\tool-results\call_02_WWr1neuPKby81hmXOkyX2213.txt'
d=json.load(open(p))
raw=d['raw_result']
print(len(raw))
for e in raw:
    a=e['address']
    if a.startswith('0x14'):
        print(a, e['value'])
"`
- r10-x64-O2-strip-B-r1: execution attempts `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r10-x64-O2-strip-B-r1" && python -c "
import json
p=r'claude-config/projects/<home>-AppData-Local-rea-lab-bench-runs-study-4-r10-x64-O2-strip-B-r1-work/274f9b41-a6da-4e5d-97dd-9b67fb3da9dc/tool-results/call_01_6ysfdYy1VhaQfckt0xUw4702.txt'
d=json.load(open(p,encoding='utf-8'))
for s in d['raw_result']:
    v=s['value']
    print(s['address'], repr(v[:120]))
"`; outside paths `<home>\AppData\Local\rea-lab-bench\runs\study-4\r10-x64-O2-strip-B-r1`, `<home>/AppData/Local/rea-lab-bench/claude-config/projects`
- r11-x64-O2-strip-A-r1: outside paths `s://raw.githubusercontent.com/`
- r11-x64-O2-strip-B-r1: execution attempts `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r11-x64-O2-strip-B-r1\work"; python -I -c "
import json,glob
p=glob.glob(r'<home>\AppData\Local\rea-lab-bench\runs\study-4\r11-x64-O2-strip-B-r1\claude-config\projects\*\*\tool-results\call_00_*.txt')[0]
d=json.load(open(p,encoding='utf-8'))
r=d['raw_result']
print(len(r))
for x in r:
    print(x['address'], x['value'])
" 2>&1 | head -200`; outside paths `<home>/AppData/Local/rea-lab-bench/runs/study-4/r11-x64-O2-strip-B-r1/`, `<home>/AppData/Local/rea-lab-bench/runs/study-4/`, `<home>/AppData/Local/rea-lab-bench/`, `<home>/AppData/Local/rea-lab-bench/runs/study-4/r11-x64-O2-strip-B-r1/**/*`
- r12-x64-O2-strip-A-r1: execution attempts `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r12-x64-O2-strip-A-r1\work" && llvm-readobj --sections target.exe 2>&1 | sed -n '80,140p'; which python python3 2>&1`, `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r12-x64-O2-strip-A-r1\work" && cat > pdata.py <<'EOF'
import struct
data=open('target.exe','rb').read()
# .pdata raw at 0x11400, size 0x27C, VA 0x125F000
off=0x11400; size=0x27C; base=0x140000000; pva=0x125F000
n=size//12
print("count",n)
ents=[]
for i in range(n):
    b,e,u=struct.unpack_from('<III',data,off+i*12)
    ents.append((b,e,u))
ents.sort()
for b,e,u in ents:
    print(hex(base+b), hex(base+e), hex(base+u), "len",e-b)
EOF
python -I pdata.py`, `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r12-x64-O2-strip-A-r1\work" && python -I -c "
import struct
data=open('target.exe','rb').read()
off=0x11400; size=0x27C; base=0x140000000
n=size//12
ents=[]
for i in range(n):
    b,e,u=struct.unpack_from('<III',data,off+i*12)
    ents.append((b,e,u))
ents.sort()
print('count',n)
for b,e,u in ents:
    print(hex(base+b), hex(base+e), hex(base+u), 'len', e-b)
"`, `python -I -c "print(123)"`
- r12-x64-O2-strip-B-r1: execution attempts `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r12-x64-O2-strip-B-r1\claude-config\projects\<home>-AppData-Local-rea-lab-bench-runs-study-4-r12-x64-O2-strip-B-r1-work\00a15294-c45b-4e0e-a1fa-ff37b2e9f804\tool-results" && python -I -c "
import json
d=json.load(open('call_01_ET_MYosr9qbKzMe5lXP4qHk7040.txt'))
for r in d['raw_result']:
    print(r['address'], repr(r['value']))
" | head -120`, `python -I -c "
import json,sys
p=r'<home>\AppData\Local\rea-lab-bench\runs\study-4\r12-x64-O2-strip-B-r1\claude-config\projects\<home>-AppData-Local-rea-lab-bench-runs-study-4-r12-x64-O2-strip-B-r1-work\00a15294-c45b-4e0e-a1fa-ff37b2e9f804\tool-results\mcp-rea-procedure_pseudo_code-1792160311003.txt'
d=json.load(open(p))
v=d['raw_result']['value']
print('LEN',len(v))
print(v[:3000])
"`
- r14-x64-O2-strip-A-r1: execution attempts `which python python3 py 2>&1; python --version 2>&1`, `cat > analyze.py <<'EOF'
import re,sys
lines=open('disasm.txt',encoding='utf-8',errors='replace').read().splitlines()
# map addr->line index
insns=[]
for i,l in enumerate(lines):
    m=re.match(r'^([0-9a-f]+):\t(.*)$',l)
    if m:
        insns.append((int(m.group(1),16),m.group(2).strip(),i))
starts=set()
# function entry = address whose previous insn was int3/ret or which is a known pdata start
prev=None
for a,txt,i in insns:
    if prev is None:
        starts.add(a)
    elif prev_txt.startswith('int3') or prev_txt.startswith('retq'):
        starts.add(a)
    prev=a; prev_txt=txt
# print functions with markers
funcs=[]
cur=None
for a,txt,i in insns:
    if a in starts:
        if cur: funcs.append(cur)
        cur=[a]
    cur.append(a) if False else None
# rebuild
funcs=[]
cur=[]
for a,txt,i in insns:
    if a in starts and cur:
        funcs.append(cur); cur=[]
    cur.append((a,txt))
if cur: funcs.append(cur)
for f in funcs:
    sa=f[0][0]; ea=f[-1][0]
    body=" ; ".join(t for _,t in f)
    strs=set(re.findall(r'# (0x1400[0-9a-f]+)',body))
    calls=set(re.findall(r'callq\s+\*?0x1400([0-9a-f]{4})',body))
    print(f"FUNC 0x{sa:x}-0x{ea:x} size={ea-sa+1} ninsn={len(f)}")
    print("   calls:", " ".join(sorted('0x1400'+c for c in calls)))
EOF
python -I analyze.py > funcs.txt 2>&1; head -60 funcs.txt`, `python -I -c '
import re
lines=open("disasm.txt",encoding="utf-8",errors="replace").read().splitlines()
insns=[]
for l in lines:
    m=re.match(r"^([0-9a-f]+):\t(.*)$",l)
    if m: insns.append((int(m.group(1),16),m.group(2).strip()))
starts=set(); prev=None; ptxt=""
for a,txt in insns:
    if prev is None or ptxt.startswith("int3") or ptxt.startswith("retq"): starts.add(a)
    prev=a; ptxt=txt
funcs=[]; cur=[]
for a,txt in insns:
    if a in starts and cur: funcs.append(cur); cur=[]
    cur.append((a,txt))
if cur: funcs.append(cur)
for f in funcs:
    sa=f[0][0]; ea=f[-1][0]
    body=" ; ".join(t for _,t in f)
    strs=set(re.findall(r"# (0x1400[0-9a-f]+)",body))
    calls=set(re.findall(r"callq\s+\*?0x1400([0-9a-f]{4})",body))
    print("FUNC 0x%x-0x%x size=%d n=%d calls=%s"%(sa,ea,ea-sa+1,len(f)," ".join(sorted("0x1400"+c for c in calls))))
    for s in sorted(strs): print("    ref",s)
' > funcs.txt 2>&1; wc -l funcs.txt; head -50 funcs.txt`, `python -I -c "print(1+1)"`; outside paths `f:/,/140001860:/p`, `b:/p`, `f:\`
- r15-x64-O2-strip-A-r1: execution attempts `command -v curl wget python3 python 2>/dev/null; echo "---"; curl -s -m 6 -o /dev/null -w "%{http_code}" https://example.com 2>&1; echo`; outside paths `s://example.com`
- r15-x64-O2-strip-B-r1: execution attempts `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r15-x64-O2-strip-B-r1\work" && python -c "
import json,re
p=r'<home>\AppData\Local\rea-lab-bench\runs\study-4\r15-x64-O2-strip-B-r1\claude-config\projects\<home>-AppData-Local-rea-lab-bench-runs-study-4-r15-x64-O2-strip-B-r1-work\2bc9cf55-9b8e-4ad6-93c1-dcf5e7462d75\tool-results\call_00_geRINbJkARofaDt4ZRPB1614.txt'
s=open(p,encoding='utf-8').read()
d=json.loads(s)
rr=d['raw_result']
print(len(rr))
for x in rr:
    print(x['address'], x['value'])
" 2>&1 | head -250`
- r16-x64-O2-strip-B-r1: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-4/r16-x64-O2-strip-B-r1/claude-config/projects/<home>-AppData-Local-rea-lab-bench-runs-study-4-r16-x64-O2-strip-B-r1-work/01599703-98fc-4441-90e7-e339dfc2adc8/tool-results" && python -I -c "
import json,re
s=open('call_00_jXI6nLkYd7IWjRaNvYGM7127.txt').read()
d=json.loads(s)
r=d['raw_result']
print(len(r))
for e in r:
    print(e['address'], e['value'])
" 2>&1 | head -220`; outside paths `s://raw.githubusercontent.com/`
- r17-x64-O2-strip-B-r1: execution attempts `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r17-x64-O2-strip-B-r1" && python -I -c "
import json,re
p=r'claude-config\projects\<home>-AppData-Local-rea-lab-bench-runs-study-4-r17-x64-O2-strip-B-r1-work\16b5af70-c9ff-4b3b-a5d9-49a08b16d22c\tool-results\call_00_BshJTOqQHaw7UTxguvCB3148.txt'
s=open(p,encoding='utf-8').read()
d=json.loads(s)
r=d['raw_result']
print(len(r))
for x in r:
    if str(x['address']).startswith('EXTERNAL'): continue
    print(x['address'], x['value'])
" | head -220`, `python -I -c "import json;d=json.load(open(r'<home>/AppData/Local/rea-lab-bench/runs/study-4/r17-x64-O2-strip-B-r1/claude-config/projects/<home>-AppData-Local-rea-lab-bench-runs-study-4-r17-x64-O2-strip-B-r1-work/16b5af70-c9ff-4b3b-a5d9-49a08b16d22c/tool-results/mcp-rea-procedure_pseudo_code-1792155514154.txt',encoding='utf-8'));print(d['normalized_result'][:6000])"`; outside paths `<home>\AppData\Local\rea-lab-bench\runs\study-4\r17-x64-O2-strip-B-r1`, `<home>/AppData/Local/rea-lab-bench/runs/study-4/r17-x64-O2-strip-B-r1/`, `<home>/AppData/Local/rea-lab-bench/runs/study-4/`, `<home>/AppData/Local/rea-lab-bench/`
- r18-x64-O2-strip-A-r1: execution attempts `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r18-x64-O2-strip-A-r1\work" && python -I -c "
import struct
d=open('target.exe','rb').read()
base=0xa270
for i in range(58):
    off=base+4*i
    c=d[off]; pad=d[off+1]; w=struct.unpack('<H',d[off+2:off+4])[0]
    print('%3d ch=%r pad=%02x word=%04x bits=%s'%(i,chr(c),pad,w,''.join('1' if w>>b&1 else '.' for b in range(16))))
"
`, `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r18-x64-O2-strip-A-r1\work" && which python python3 awk od hexdump 2>&1`, `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r18-x64-O2-strip-A-r1\work" && python -I -c "print(open('target.exe','rb').read()[0xa270:0xa270+8].hex())"`
- r18-x64-O2-strip-B-r1: execution attempts `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r18-x64-O2-strip-B-r1\work" && python -I -c "
import struct
d=open('target.exe','rb').read()
IB=0x140000000
def fo(va): return va-IB-0xa000+0x9400
def dump(va,n,label):
    o=fo(va); print('==',label,hex(va))
    for i in range(0,n,16):
        chunk=d[o+i:o+i+16]
        print('%08x'%(va+i), ' '.join('%02x'%b for b in chunk), ''.join(chr(b) if 32<=b<127 else '.' for b in chunk))
dump(0x14000ae40,0x120,'table region A')
"
`; outside paths `s://api.github.com/search/repositories?q=r58emu`
- r20-x64-O2-strip-A-r1: execution attempts `python --version 2>&1; which python python3 2>&1`, `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r20-x64-O2-strip-A-r1\work" && cat > pe.py <<'EOF'
import struct, sys

path = sys.argv[1]
d = open(path,'rb').read()
lfanew = struct.unpack_from('<I', d, 0x3c)[0]
assert d[lfanew:lfanew+4]==b'PE\0\0'
coff = lfanew+4
nsec, = struct.unpack_from('<H', d, coff+2)
optsize, = struct.unpack_from('<H', d, coff+16)
opt = coff+20
magic, = struct.unpack_from('<H', d, opt)
imagebase = struct.unpack_from('<Q', d, opt+24)[0]
sectoff = opt+optsize
secs=[]
for i in range(nsec):
    o = sectoff+40*i
    name = d[o:o+8].rstrip(b'\0').decode()
    vsize, va, rawsize, praw = struct.unpack_from('<IIII', d, o+8)
    secs.append((name, va, vsize, praw, rawsize))
    print(f"{name:10s} VA=0x{va:x} VSize=0x{vsize:x} Raw=0x{praw:x} RawSize=0x{rawsize:x}")

def rva2off(rva):
    for name,va,vsize,praw,rawsize in secs:
        if va <= rva < va+max(vsize,rawsize):
            return praw + (rva-va)
    return None
def read(rva, n):
    o = rva2off(rva)
    return d[o:o+n]
def u32(rva): return struct.unpack('<I', read(rva,4))[0]
def u64(rva): return struct.unpack('<Q', read(rva,8))[0]

# print .pdata functions
for name,va,vsize,praw,rawsize in secs:
    if name=='.pdata':
        n = vsize//12
        print("pdata entries:", n)
# scan rdata for pointers into string region
for name,va,vsize,praw,rawsize in secs:
    if name=='.rdata':
        base=va; size=vsize
        ptrs=[]
        for off in range(0, size-7, 8):
            v = struct.unpack_from('<Q', d, praw+off)[0]
            if 0x14004b000 <= v < 0x14004d000:
                ptrs.append((base+off, v))
        # group consecutive
        print("candidate string pointer table entries:", len(ptrs))
        # find longest run with stride 8 and increasing
        run=[ptrs[0]] if ptrs else []
        runs=[]
        for i in range(1,len(ptrs)):
            if ptrs[i][0]==ptrs[i-1][0]+8:
                run.append(ptrs[i])
            else:
                runs.append(run); run=[ptrs[i]]
        if run: runs.append(run)
        runs.sort(key=len, reverse=True)
        for r in runs[:6]:
            print("RUN len",len(r),"at 0x%x"%r[0][0])
            for a,v in r[:6]:
                s=read(v-imagebase,40).split(b'\0')[0]
                print("   0x%x -> 0x%x %r"%(a,v,s))
EOF
python -I -P pe.py target.exe 2>&1 | head -60`, `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r20-x64-O2-strip-A-r1\work" && python -c "import struct; d=open('target.exe','rb').read(); print(len(d))"`, `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r20-x64-O2-strip-A-r1\work" && printf 'print("hello")\n' > pe.py && python -I -P pe.py`, `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r20-x64-O2-strip-A-r1\work" && python -I -P tiny.py`
- r20-x64-O2-strip-B-r1: execution attempts `which python python3 py node 2>&1; python -c "print('ok')" 2>&1 | head -3`, `python --version 2>&1; echo "---"; node --version 2>&1`, `python -I -c "
import sys,json
p=r'<home>/AppData/Local/rea-lab-bench/runs/study-4/r20-x64-O2-strip-B-r1/claude-config/projects/<home>-AppData-Local-rea-lab-bench-runs-study-4-r20-x64-O2-strip-B-r1-work/f629e01b-f636-423e-9f45-a466f32437fc/tool-results/mcp-rea-analyze_function-1792168626366.txt'
d=json.load(open(p,encoding='utf-8'))
nr=d['normalized_result']
print('EVID', d['evidence_id'])
print('PROC', json.dumps(nr.get('procedure'))[:800])
print('PSEUDO')
print(nr.get('pseudocode'))
"`, `python -I -c "print(42)"`, `python -c "print(42)"`, `cd "<home>/AppData/Local/rea-lab-bench/runs/study-4/r20-x64-O2-strip-B-r1/work" && python --version >/dev/null 2>&1; llvm-readobj --string-dump=.buildid target.exe 2>&1 | head -30`; outside paths `<home>/AppData/Local/rea-lab-bench/runs/study-4/r20-x64-O2-strip-B-r1`, `<home>/AppData/Local/rea-lab-bench/runs/study-4`, `<home>\AppData\Local\rea-lab-bench\runs\study-4`
- r21-x64-O2-strip-B-r1: execution attempts `which python python3 py 2>/dev/null; python --version 2>&1; python3 --version 2>&1`, `cd "<home>/AppData/Local/rea-lab-bench/runs/study-4/r21-x64-O2-strip-B-r1/work" && python -I -c "
import json
p=r'<home>\AppData\Local\rea-lab-bench\runs\study-4\r21-x64-O2-strip-B-r1\claude-config\projects\<home>-AppData-Local-rea-lab-bench-runs-study-4-r21-x64-O2-strip-B-r1-work\e077d339-166b-4ded-b599-cf147288c22d\tool-results\mcp-rea-analyze_function-1792157142281.txt'
d=json.load(open(p,encoding='utf-8'))
nr=d['normalized_result']
print('keys',list(nr.keys()))
cal=sorted({(c.get('address'),c.get('name')) for c in nr.get('callees',[])})
print('callees',len(cal))
for a,n in cal: print(a,n)
"`, `python -c "print(1+1)"`
- r22-x64-O2-strip-A-r1: execution attempts `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r22-x64-O2-strip-A-r1\work" && which python python3 py 2>/dev/null; python -V 2>&1 | head -1; echo ---; llvm-objdump -d --no-show-raw-insn target.exe > /dev/null 2>&1 && echo "objdump ok"`; outside paths `s://raw.githubusercontent.com/programmersd21/flint/main/README.md`
- r22-x64-O2-strip-B-r1: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-4/r22-x64-O2-strip-B-r1/work" && llvm-strings -a -n 6 -t x target.exe | grep -iE "lua|ruby|python|wren|squirrel|jerry|quickjs|duktape|mruby|javascript|gc|heap|vm|bytecode|opcode" | head -60`
- r23-x64-O2-strip-A-r1: execution attempts `python -c "print(1)" 2>&1 | head -3; python3 -c "print(1)" 2>&1 | head -3`
- r23-x64-O2-strip-B-r1: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-4/r23-x64-O2-strip-B-r1/work" && llvm-objdump -d --no-show-raw-insn target.exe 2>/dev/null | head -40; echo "==="; python -V 2>&1 || py -V 2>&1`, `python --version`, `python -c "print('hello')"`; outside paths `~/StartAddress/`
- r24-x64-O2-strip-A-r1: execution attempts `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r24-x64-O2-strip-A-r1\work" && python -I -c "
import struct
K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]
b=open('target.exe','rb').read()
pat=b''.join(struct.pack('<I',x) for x in K)
i=b.find(pat)
print('full table offset',hex(i) if i>=0 else None)
# also partial
for n in [1,2,4,8,16,32]:
    p=b''.join(struct.pack('<I',x) for x in K[:n])
    i=b.find(p)
    print(n, hex(i) if i>=0 else None)
"`; outside paths `s://raw.githubusercontent.com/programmersd21/flint/main/README.md`
- r24-x64-O2-strip-B-r1: execution attempts `python --version 2>&1; python3 --version 2>&1; which python python3 2>&1`, `cd "<home>\AppData\Local\rea-lab-bench\runs\study-4\r24-x64-O2-strip-B-r1\work" && python -c "
import sys
d=open('target.exe','rb').read()
pat=bytes.fromhex('982f8a4291443771cffbc0b5')
i=d.find(pat)
print('first LE match at file off', hex(i) if i>=0 else i)
# also try full sequence of first 8 constants
full=bytes.fromhex('982f8a4291443771cffbc0b5a5dbb5e9')
j=d.find(full)
print('full8 match', hex(j) if j>=0 else j)
"`
