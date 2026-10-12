# Benchmark report: study-1

Runs: 70. Set: held-out. Claude Code 2.1.296, model claude-sonnet-5-5, effort medium, rea 6.4.0.

Rates show successes/runs, the estimate and its Wilson 95 % interval. Cost is the equivalent cost reported by Claude Code, not money spent.

## Outcome by condition

| Condition | Solved | Mechanism right | Strict manifest | Classifier stops (runs) | Refused | Timed out | Denied commands | Median time | Median turns | Median input tokens | Median output tokens | Median cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 28/30 (93 %, 79 %-98 %) | 29/30 (97 %, 83 %-99 %) | 25/30 (83 %, 66 %-93 %) | 7 | 1 | 0 | 19 | 23 s | 5 | 85023 | 1977 | 0.10 USD |
| B | 28/30 (93 %, 79 %-98 %) | 27/30 (90 %, 74 %-97 %) | 28/30 (93 %, 79 %-98 %) | 17 | 0 | 0 | 9 | 54 s | 11 | 271514 | 2611 | 0.25 USD |
| C | 9/10 (90 %, 60 %-98 %) | 9/10 (90 %, 60 %-98 %) | 9/10 (90 %, 60 %-98 %) | 6 | 0 | 0 | 3 | 55 s | 10 | 325003 | 2634 | 0.28 USD |

## Solved by family

| Family | A | B | C |
|---|---|---|---|
| compare | 3/3 (100 %, 44 %-100 %) | 3/3 (100 %, 44 %-100 %) | 1/1 (100 %, 21 %-100 %) |
| xor | 3/3 (100 %, 44 %-100 %) | 3/3 (100 %, 44 %-100 %) | 1/1 (100 %, 21 %-100 %) |
| checksum | 6/6 (100 %, 61 %-100 %) | 6/6 (100 %, 61 %-100 %) | 2/2 (100 %, 34 %-100 %) |
| table | 1/3 (33 %, 6 %-79 %) | 1/3 (33 %, 6 %-79 %) | 0/1 (0 %, 0 %-79 %) |
| state | 6/6 (100 %, 61 %-100 %) | 6/6 (100 %, 61 %-100 %) | 2/2 (100 %, 34 %-100 %) |
| pairs | 3/3 (100 %, 44 %-100 %) | 3/3 (100 %, 44 %-100 %) | 1/1 (100 %, 21 %-100 %) |
| sbox | 3/3 (100 %, 44 %-100 %) | 3/3 (100 %, 44 %-100 %) | 1/1 (100 %, 21 %-100 %) |
| indirect | 3/3 (100 %, 44 %-100 %) | 3/3 (100 %, 44 %-100 %) | 1/1 (100 %, 21 %-100 %) |

## Paired comparisons (exact McNemar)

| Pair | Pairs | Only first solved | Only second solved | p-value |
|---|---|---|---|---|
| A vs B | 30 | 1 | 1 | 1.0000 |
| B vs C | 10 | 0 | 0 | 1.0000 |
| A vs C | 10 | 1 | 0 | 1.0000 |

## rea usage and Evidence (conditions B and C)

| Condition | Used rea | First call open_binary | Opened and closed | Repeated calls | Input validation failures | Citations authenticated | Citations about the target | Invented ids | Skill loaded |
|---|---|---|---|---|---|---|---|---|---|
| B | 30/30 (100 %, 89 %-100 %) | 30/30 (100 %, 89 %-100 %) | 28/30 (93 %, 79 %-98 %) | 1 | 19 | 60/60 | 60/60 | 0 | 0/30 (0 %, 0 %-11 %) |
| C | 10/10 (100 %, 72 %-100 %) | 10/10 (100 %, 72 %-100 %) | 10/10 (100 %, 72 %-100 %) | 0 | 3 | 20/20 | 20/20 | 0 | 0/10 (0 %, 0 %-28 %) |

## Runs flagged for review

- c03-checksum-x64-O2-strip-A-r1: execution attempts `cat > /tmp/s.py <<'E'
import random
W={2:3,4:5,5:6,6:7,8:9,9:10,10:11,11:12,0:1,1:2,3:4,7:8}
def ok(s):
    T=sum(ord(s[i])*W[i] for i in range(12))
    return ((T*-0x5c5f+0x34c8)&0xffff)<0x2a4
while True:
    s=''.join(random.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(12))
    if ok(s): print(s);break
E
python -I /tmp/s.py; llvm-strings target.exe | grep -i access`
- c03-checksum-x64-O2-strip-A-r2: execution attempts `cd /tmp && python -I -c "
import random
for b in range(97,123):
  s=sum((i+1)*b for i in range(12))
  v=(s*0xffffa3a1+0x34c8)&0xffff
  if v<0x2a4: print(chr(b)*12,v)
"`
- c03-checksum-x64-O2-strip-A-r3: execution attempts `python -I -c "
import random,string
w=[1,2,3,4,5,6,7,8,9,10,11,12]
# weights per char index: c0=1,c1=2,c2=3,c3=4,c4=5,c5=6,c6=7,c7=8,c8=9,c9=10,c10=11,c11=12
while 1:
    s=''.join(random.choice(string.ascii_lowercase) for _ in range(12))
    S=sum(a*ord(c) for a,c in zip(w,s))
    if (S*0xffffa3a1+0x34c8)&0xffff<0x2a4: print(s);break
"`
- c03-checksum-x64-O2-strip-B-r1: execution attempts `cd /tmp && python -I -c "
import itertools
S=[s for s in range(0,65536) if ((s*-0x5c5f+0x34c8)&0xffff)<0x2a4]
print(len(S),S[:5])
# 'a'*12 base sum
base=97*78
print(base,[ (base*-0x5c5f+0x34c8)&0xffff])
t=set(S)
import random
random.seed(1)
while True:
    c=[random.randint(97,122) for _ in range(12)]
    s=sum((i+1)*x for i,x in enumerate(c))
    if s in t: print(''.join(map(chr,c)),s);break
"`
- c03-checksum-x64-O2-strip-B-r2: execution attempts `python -I -c "
for S in range(78*97,78*122+1):
    if (S*-0x5c5f+0x34c8)&0xffff<0x2a4: print(S);break
S=[s for s in range(78*97,78*122+1) if (s*-0x5c5f+0x34c8)&0xffff<0x2a4][0]
# 12 chars weights 1..12, start all 'a'
c=[97]*12; r=S-sum((i+1)*97 for i in range(12))
for i in range(11,-1,-1):
    d=min(25,r//(i+1)); c[i]+=d; r-=d*(i+1)
print(r,''.join(map(chr,c)))
"`
- c03-checksum-x64-O2-strip-B-r3: execution attempts `python3 -I -c "
import itertools, random

def check(buf):
    assert len(buf)==12
    for b in buf:
        v = (b + 0x85) & 0xff
        if not (0xe5 < v):
            return False
    weights = [1,2,3,4,5,6,7,8,9,10,11,12]
    s = sum(b*w for b,w in zip(buf,weights)) & 0xffff
    val = (s * (-0x5c5f) + 0x34c8) & 0xffff
    return val < 0x2a4

# brute force search over checksum target first
# find checksum s in 0..65535 satisfying hash condition, then find letter combo summing appropriately
# weights sum range: letters a-z = 0x61-0x7a (97-122)
minsum = 97*sum(range(1,13))
maxsum = 122*sum(range(1,13))
print('weight total', sum(range(1,13)), minsum, maxsum)

found = None
for s in range(minsum, maxsum+1):
    val = (s*(-0x5c5f)+0x34c8) & 0xffff
    if val < 0x2a4:
        found = s
        break
print('first s', found)
"
`
- c03-checksum-x64-O2-strip-C-r1: execution attempts `python -I -c "
for S in range(7566,9517):
    if (S*-0x5c5f+0x34c8)&0xffff<0x2a4: print(S)
" | head -5`
- c03-checksum-x86-O2-strip-A-r1: execution attempts `python -I -c "
import itertools,random
random.seed(1)
for _ in range(10**6):
    s=''.join(random.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(12))
    S=sum((i+1)*ord(c) for i,c in enumerate(s))
    if (S*-0x5c5f+0x34c8)&0xffff<0x2a4:
        print(s,S);break
"`
- c03-checksum-x86-O2-strip-A-r2: execution attempts `cat > /tmp/s.py <<'E'
import random
for _ in range(10**7):
    s=''.join(random.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(12))
    S=sum((i+1)*ord(c) for i,c in enumerate(s))
    if ((S*-0x5c5f+0x34c8)&0xffff)<0x2a4:
        print(s);break
E
python -I /tmp/s.py`
- c03-checksum-x86-O2-strip-A-r3: execution attempts `python -I -c "
for S in range(78*97,78*122+1):
  if ((S*-23647+0x34c8)&0xffff)<676:
    print(S);break
S0=78*97
S=S0 if False else S
d=S-78*97
s=[97]*12
i=11
while d>0:
  k=min(d//(i+1),25-(s[i]-97));s[i]+=k;d-=k*(i+1)
  if d>0 and k==0 or s[i]==122:i-=1
  if i<0:break
print(d,''.join(map(chr,s)),sum((j+1)*c for j,c in enumerate(s)))
"`
- c03-checksum-x86-O2-strip-B-r1: execution attempts `python -I -c "
for S in range(97*78,122*78+1):
    if (S*-0x5c5f+0x34c8)&0xffff<=0x2a3: print(S,(S*-0x5c5f+0x34c8)&0xffff)
" | head`
- c03-checksum-x86-O2-strip-B-r2: execution attempts `python -I -c "
w=range(1,13)
for S in range(97*78,122*78+1):
    if (0x34c8-0x5c5f*S)%65536<=0x2a3: print(S);break
S0=S
# build string: start all 'a', add extra greedily
extra=S0-97*78
s=[97]*12
for i in range(11,-1,-1):
    k=min(25,extra//(i+1)); s[i]+=k; extra-=k*(i+1)
print(extra,''.join(map(chr,s)),sum(c*(i+1) for i,c in enumerate(s)),S0)
"`
- c03-checksum-x86-O2-strip-B-r3: execution attempts `python3 -c "
for s in range(0, 97*12+2000):
    pass
"
which python3 python`; outside paths `<home>\AppData\Local\rea-lab-bench\runs\study-1\c03`
- c03-checksum-x86-O2-strip-C-r1: execution attempts `python3 -c "
import itertools
# find a 12-char string of lowercase letters satisfying the checksum
# weight[i] = i+1 for i in 0..11
best=None
import random
random.seed(1)
def check(buf):
    s=sum(buf[i]*(i+1) for i in range(12)) & 0xFFFFFFFF
    v=(s*41889+13512)&0xFFFF
    return v<=675, v

# brute force: try all 'a' then adjust last char to tune sum
base=[ord('a')]*12
s=sum(base[i]*(i+1) for i in range(12))
# try varying each position's letter to find a valid combo via search
found=None
for trial in range(2000000):
    buf=[97+random.randint(0,25) for _ in range(12)]
    ok,v=check(buf)
    if ok:
        found=(buf,v)
        break
print(found)
if found:
    b,v=found
    print(''.join(chr(c) for c in b), v)
"
`
- c04-table-x64-O2-strip-A-r1: execution attempts `python -I -c "
import struct
d=open('target.exe','rb').read()
pe=struct.unpack_from('<I',d,0x3c)[0]
ns=struct.unpack_from('<H',d,pe+6)[0];so=struct.unpack_from('<H',d,pe+20)[0]
for i in range(ns):
  o=pe+24+so+40*i
  n=d[o:o+8];vs,va,rs,rp=struct.unpack_from('<IIII',d,o+8)
  if n.startswith(b'.rdata'):
    b=d[rp+0x78-0x0:rp+0x78+0x3c]
    t=struct.unpack_from('<15i',d,rp+0x78)
    print([hex(x) for x in t])
    print(d[rp+0xb4-0:rp+0xb4+40])
"`
- c05-state-x86-O2-strip-A-r1: outside paths `/s/sim.py`
- c05-state-x86-O2-strip-A-r2: execution attempts `mkdir -p ../s && cat > ../s/sm.py <<'E'
import sys
from collections import deque
class Need(Exception): pass
def run(s):
    def rd(i):
        if i<len(s): return ord(s[i])
        raise Need(i)
    c=rd(0)
    if c==0: return False
    eax=0; ecx=0; edx=0; st='A'
    while True:
        if st=='A':
            if c==116: st='L'; continue
            if c!=115: return False
            st='S'
        elif st=='S':
            c=rd(eax+1); eax+=1
            if c==105: continue
            if c!=97: return False
            st='Z'
        elif st=='Z':
            c=rd(eax+1); eax+=1
            if c==48: continue
            if c!=102: return False
            st='F'
        elif st=='F':
            c=rd(eax+1); eax+=1
            if c!=102:
                if c==118: st='L'; continue
                return False
            st='C'
        elif st=='C':
            c=rd(eax+1); eax+=1
            if c==99: continue
            if c!=114: return False
            st='R'
        elif st=='R':
            c=rd(eax+1)
            if c!=111:
                eax+=1
                if c==50: st='S'; continue
                return False
            c=rd(eax+2); eax+=2
            if c!=110:
                if c==99: st='F'; continue
                return False
            ecx=eax; st='N'
        elif st=='N':
            c=rd(ecx+1)
            if c!=45:
                if c==48: ecx+=1; eax=ecx; st='R'; continue
                return False
            eax=ecx+2; edx=ecx+8; st='G'
        elif st=='G':
            ecx=edx; d=rd(eax)
            if d!=103:
                if d==121: st='R'; continue
                return False
            e=rd(eax+1); eax+=2; edx=ecx+2
            if e==112: continue
            if e!=114: return False
            d=rd(eax)
            if d!=111:
                if d==113: st='F'; continue
                return False
            d=rd(eax+1)
            if d==118:
                e=rd(eax+2)
                if e!=101:
                    if e==109: eax+=2; st='R'; continue
                    return False
                f=rd(eax+3)
                if f!=45:
                    if f==111: eax+=3; st='R'; continue
                    return False
                st='T'
            else:
                eax+=1; ecx=eax
                if d==57: st='N'; continue
                return False
        elif st=='T':
            a=rd(ecx)
            if a!=51:
                if a==102: st='N'; continue
                return False
            a=rd(ecx+1); ecx+=2
            if a==100: continue
            return a==56 and rd(ecx)==0
        elif st=='L':
            c=rd(eax+1); eax+=1
            if c!=0: st='A'; continue
            return False
alpha="tsia0fvcro2n-gpyq39ml8de"
q=deque(['']); seen=set()
while q:
    s=q.popleft()
    try:
        r=run(s)
        if r: print(repr(s)); break
    except Need as n:
        if n.args[0]==len(s):
            try:
                if run(s+'\0'): print(repr(s)); break
            except Need: pass
        if len(s)<30:
            for ch in alpha: q.append(s+ch)
E
python -I ../s/sm.py`; outside paths `/s/sm.py`, `Bash: parent folder`
- c07-sbox-x64-O2-strip-A-r2: execution attempts `python -I -c "
s=bytes.fromhex('fca7d425f87cd5b47a0eeac99a1d78d3766790c88704932249 44c354286f3ee4feff40a2c2a63dce9c8aafd943a0a5517089c0c71a23dbe315d8c58391cce9a963f2a156857b34534e4cf91eeb71f6f0de29e7fbee7e164d9e7577cae600ef42b0826e1938e1693f5b122d377fe0b632355e4a039741e8fa6db7ec1b2e9baa84b8a33355aeb3abc631be24bc5fa4815c13cb947d58df3be2cd2a06991f2cd6b5bb9fd76a8eb9928b50b1078cc4d0cf26daf54f18dc055d397257 0a27953c65800f20bd4b216886c148d1bfe574edf19d59463a080b1436f76b6011792bac0c0df3b2f4988f8d01d261666cba6409ad525a17a8302f45dd10964773021cfd8862'.replace(' ',''))
e=bytes.fromhex('692d324a38a0b612e06e4103a0c723')
print(len(s),len(set(s)));print(bytes(s.index(b) for b in e))"`
- c07-sbox-x64-O2-strip-A-r3: execution attempts `python3 -c "
sbox_hex='''fca7d425f87cd5b47a0eeac99a1d78d3
766790c8870493224944c354286f3ee4
feff40a2c2a63dce9c8aafd943a0a551
7089c0c71a23dbe315d8c58391cce9a9
63f2a156857b34534e4cf91eeb71f6f0
de29e7fbee7e164d9e7577cae600ef42
b0826e1938e1693f5b122d377fe0b632
355e4a03974 1e8fa6db7ec1b2e9baa84
b8a33355aeb3abc631be24bc5fa4815c
13cb947d58df3be2cd2a06991f2cd6b5
bb9fd76a8eb9928b50b1078cc4d0cf26
daf54f18dc055d39 72570a27953c6580
0f20bd4b216886c148d1bfe574edf19d
59463a080b1436f76b6011792bac0c0d
f3b2f4988f8d01d261666cba6409ad52
5a17a8302f45dd10964773021cfd8862'''.replace(' ','').replace(chr(10),'')
sbox=bytes.fromhex(sbox_hex)
target=bytes.fromhex('692d324a38a0b612e06e4103a0c72300'[:30])
res=''
for t in target:
    idx=sbox.index(t)
    res+=chr(idx)
print(repr(res), len(res))
"
`
- c07-sbox-x64-O2-strip-B-r1: execution attempts `python -I -c "
h='fca7d425f87cd5b47a0eeac99a1d78d3766790c8870493224944c354286f3ee4feff40a2c2a63dce9c8aafd943a0a5517089c0c71a23dbe315d8c58391cce9a963f2a156857b34534e4cf91eeb71f6f0de29e7fbee7e164d9e7577cae600ef42b0826e1938e1693f5b122d377fe0b632355e4a039741e8fa6db7ec1b2e9baa84b8a33355aeb3abc631be24bc5fa4815c13cb947d58df3be2cd2a06991f2cd6b5bb9fd76a8eb9928b50b1078cc4d0cf26daf54f18dc055d3972570a27953c65800f20bd4b216886c148d1bfe574edf19d59463a080b1436f76b6011792bac0c0df3b2f4988f8d01d261666cba6409ad525a17a8302f45dd10964773021cfd8862692d324a38a0b612e06e4103a0c72300'
b=bytes.fromhex(h);s=b[:256];t=b[256:271]
print(len(set(s)),[s.index(x) for x in t])
print(bytes(s.index(x) for x in t))"`
- c07-sbox-x64-O2-strip-B-r2: execution attempts `python -I -c "
t=bytes.fromhex('fca7d425f87cd5b47a0eeac99a1d78d3766790c8870493224944c354286f3ee4feff40a2c2a63dce9c8aafd943a0a5517089c0c71a23dbe315d8c58391cce9a963f2a156857b34534e4cf91eeb71f6f0de29e7fbee7e164d9e7577cae600ef42b0826e1938e1693f5b122d377fe0b632355e4a039741e8fa6db7ec1b2e9baa84b8a33355aeb3abc631be24bc5fa4815c13cb947d58df3be2cd2a06991f2cd6b5bb9fd76a8eb9928b50b1078cc4d0cf26daf54f18dc055d3972570a27953c65800f20bd4b216886c148d1bfe574edf19d59463a080b1436f76b6011792bac0c0df3b2f4988f8d01d261666cba6409ad525a17a8302f45dd10964773021cfd8862')
g=bytes.fromhex('692d324a38a0b612e06e4103a0c723')
print(len(set(t)),[[i for i in range(256) if t[i]==c] for c in g])"`
- c07-sbox-x64-O2-strip-B-r3: execution attempts `python -I -c "
t=bytes.fromhex('fca7d425f87cd5b47a0eeac99a1d78d3766790c8870493224944c354286f3ee4feff40a2c2a63dce9c8aafd943a0a5517089c0c71a23dbe315d8c58391cce9a963f2a156857b34534e4cf91eeb71f6f0de29e7fbee7e164d9e7577cae600ef42b0826e1938e1693f5b122d377fe0b632355e4a039741e8fa6db7ec1b2e9baa84b8a33355aeb3abc631be24bc5fa4815c13cb947d58df3be2cd2a06991f2cd6b5bb9fd76a8eb9928b50b1078cc4d0cf26daf54f18dc055d3972570a27953c65800f20bd4b216886c148d1bfe574edf19d59463a080b1436f76b6011792bac0c0df3b2f4988f8d01d261666cba6409ad525a17a8302f45dd10964773021cfd8862')
g=bytes.fromhex('692d324a38a0b612e06e4103a0c72300')[:15]
print(len(set(t)))
print([[i for i in range(256) if t[i]==b] for b in g])
"`
- c07-sbox-x64-O2-strip-C-r1: execution attempts `cd /tmp && python -I -c "
h='fca7d425f87cd5b47a0eeac99a1d78d3766790c8870493224944c354286f3ee4feff40a2c2a63dce9c8aafd943a0a5517089c0c71a23dbe315d8c58391cce9a963f2a156857b34534e4cf91eeb71f6f0de29e7fbee7e164d9e7577cae600ef42b0826e1938e1693f5b122d377fe0b632355e4a039741e8fa6db7ec1b2e9baa84b8a33355aeb3abc631be24bc5fa4815c13cb947d58df3be2cd2a06991f2cd6b5bb9fd76a8eb9928b50b1078cc4d0cf26daf54f18dc055d3972570a27953c65800f20bd4b216886c148d1bfe574edf19d59463a080b1436f76b6011792bac0c0df3b2f4988f8d01d261666cba6409ad525a17a8302f45dd10964773021cfd8862692d324a38a0b612e06e4103a0c72300'
b=bytes.fromhex(h);print(len(b),len(set(b[:256])))
t=b[256:271];print(t.hex())
print(bytes(b.index(x) for x in t))"`
