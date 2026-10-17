# Benchmark report: study-5

Runs: 180. Set: held-out-real. Claude Code 2.1.296, model claude-sonnet-5-5, effort medium, rea 6.4.0.

Rates show successes/runs, the estimate and its Wilson 95 % interval. Cost is the equivalent cost reported by Claude Code, not money spent.

## Outcome by condition

Correct: the answered address falls inside the target function or table. Without image base: answers given as relative addresses, counted as correct when they fall inside.

| Condition | Correct | Exact start | Without image base | Source name right | Strict manifest | Classifier stops (runs) | Refused | Timed out | Denied commands | Median time | Median turns | Median input tokens | Median output tokens | Median cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B | 52/60 (87 %, 76 %-93 %) | 52/60 (87 %, 76 %-93 %) | 0 | 4/60 (7 %, 3 %-16 %) | 60/60 (100 %, 94 %-100 %) | 0 | 0 | 0 | 41 | 68 s | 15 | 339903 | 2344 | 0.21 USD |
| C1 | 55/60 (92 %, 82 %-96 %) | 55/60 (92 %, 82 %-96 %) | 0 | 6/60 (10 %, 5 %-20 %) | 59/60 (98 %, 91 %-100 %) | 0 | 0 | 0 | 33 | 71 s | 16 | 393747 | 2248 | 0.23 USD |
| C2 | 52/60 (87 %, 76 %-93 %) | 52/60 (87 %, 76 %-93 %) | 0 | 5/60 (8 %, 4 %-18 %) | 58/60 (97 %, 89 %-99 %) | 0 | 0 | 0 | 45 | 73 s | 16 | 409498 | 2728 | 0.24 USD |

## Correct by family

| Family | B | C1 | C2 |
|---|---|---|---|
| behaviour | 40/48 (83 %, 70 %-91 %) | 43/48 (90 %, 78 %-95 %) | 41/48 (85 %, 73 %-93 %) |
| chain | 12/12 (100 %, 76 %-100 %) | 12/12 (100 %, 76 %-100 %) | 11/12 (92 %, 65 %-99 %) |

## Correct by program

| Program | B | C1 | C2 |
|---|---|---|---|
| sgiemu | 14/16 (88 %, 64 %-97 %) | 16/16 (100 %, 81 %-100 %) | 15/16 (94 %, 72 %-99 %) |
| c5xtools | 10/14 (71 %, 45 %-88 %) | 10/14 (71 %, 45 %-88 %) | 10/14 (71 %, 45 %-88 %) |
| moppe-emu | 14/14 (100 %, 78 %-100 %) | 14/14 (100 %, 78 %-100 %) | 12/14 (86 %, 60 %-96 %) |
| flint | 14/16 (88 %, 64 %-97 %) | 15/16 (94 %, 72 %-99 %) | 15/16 (94 %, 72 %-99 %) |

## Paired comparisons (exact McNemar)

| Pair | Pairs | Only first correct | Only second correct | p-value |
|---|---|---|---|---|
| C1 vs C2 | 60 | 4 | 1 | 0.3750 |
| B vs C1 | 60 | 1 | 4 | 0.3750 |
| B vs C2 | 60 | 5 | 5 | 1.0000 |
| C1 vs C2, without the string control | 60 | 4 | 1 | 0.3750 |
| B vs C1, without the string control | 60 | 1 | 4 | 0.3750 |
| B vs C2, without the string control | 60 | 5 | 5 | 1.0000 |
| C1 vs C2, one pair per task (right in at least half of its repetitions), without the control | 30 | 1 | 0 | 1.0000 |
| B vs C1, one pair per task (right in at least half of its repetitions), without the control | 30 | 1 | 1 | 1.0000 |
| B vs C2, one pair per task (right in at least half of its repetitions), without the control | 30 | 2 | 1 | 1.0000 |

## Confirmatory outcome: cost per run, paired by task (exact tests)

H1 compares C1 with C2 and H2 compares B with C1, each tested apart at alpha 0.05; B vs C2 is descriptive. Each task's cost is the mean equivalent cost of its runs in a condition, and the outcome is the log of the second cost over the first. The ratio is the exponential of the Hodges-Lehmann estimate, with its exact 95 % interval; below 1 the second condition is cheaper.

| Pair | Role | Tasks | Median of first | Median of second | Ratio (Hodges-Lehmann) | 95 % interval | W+ | p-value |
|---|---|---|---|---|---|---|---|---|
| C1 vs C2 | H1 | 30 | 0.2311 USD | 0.2493 USD | 1.140 | 1.047 to 1.262 | 353 | 0.0120 |
| B vs C1 | H2 | 30 | 0.2298 USD | 0.2311 USD | 0.976 | 0.815 to 1.156 | 222 | 0.8394 |
| B vs C2 | descriptive | 30 | 0.2298 USD | 0.2493 USD | 1.122 | 0.959 to 1.316 | 304 | 0.1460 |

### Sensitivity: the first request's cache writes priced as cache reads

Runs of one condition share a cached prompt prefix, so which run writes it depends on the run order. Here every run's first-request cache writes are priced as cache reads, as if the prefix were already cached; the result is descriptive.

| Pair | Role | Tasks | Median of first | Median of second | Ratio (Hodges-Lehmann) | 95 % interval | W+ | p-value |
|---|---|---|---|---|---|---|---|---|
| C1 vs C2 | descriptive | 30 | 0.1866 USD | 0.2025 USD | 1.155 | 1.043 to 1.308 | 347 | 0.0175 |
| B vs C1 | descriptive | 30 | 0.2070 USD | 0.1866 USD | 0.879 | 0.720 to 1.048 | 165 | 0.1706 |
| B vs C2 | descriptive | 30 | 0.2070 USD | 0.2025 USD | 1.012 | 0.855 to 1.198 | 245 | 0.8078 |

## Citations (descriptive)

Two definitions. The cited Evidence states the address when the answered address appears as a number in the result of the Evidence cited for answer_address, as in studies 3 and 4. It names the function when it states the address, or when the result is decompiled code whose signature carries the decompiler's default name for that address (Ghidra's `FUN_` followed by the address, without 0x). The request's parameters never count: a procedure tool given an address inside a function answers for the function that contains it. Pairs are matched by task and repetition, and the McNemar p-values are descriptive.

| Condition | Runs | States the address | Names the function |
|---|---|---|---|
| B | 60 | 18 | 58 |
| C1 | 60 | 19 | 56 |
| C2 | 60 | 20 | 56 |

| Pair | Pairs | States: only first | States: only second | States: p-value | Names: only first | Names: only second | Names: p-value |
|---|---|---|---|---|---|---|---|
| C1 vs C2 | 60 | 6 | 7 | 1.0000 | 2 | 2 | 1.0000 |
| B vs C1 | 60 | 5 | 6 | 1.0000 | 3 | 1 | 0.6250 |
| B vs C2 | 60 | 5 | 7 | 0.7744 | 3 | 1 | 0.6250 |

### By the tool that produced the cited Evidence

| Cited tool | Condition | Runs | States the address | Names the function |
|---|---|---|---|---|
| `batch_decompile` | C2 | 4 | 4 | 4 |
| `list_procedures` | C1 | 1 | 1 | 1 |
| `procedure_assembly` | B | 1 | 1 | 1 |
| `procedure_assembly` | C1 | 2 | 2 | 2 |
| `procedure_callers` | B | 13 | 12 | 12 |
| `procedure_callers` | C1 | 12 | 12 | 12 |
| `procedure_callers` | C2 | 13 | 12 | 12 |
| `procedure_info` | B | 3 | 3 | 3 |
| `procedure_info` | C1 | 4 | 4 | 4 |
| `procedure_pseudo_code` | B | 41 | 0 | 40 |
| `procedure_pseudo_code` | C1 | 40 | 0 | 37 |
| `procedure_pseudo_code` | C2 | 38 | 0 | 36 |
| `resolve_containing_procedure` | B | 1 | 1 | 1 |
| `resolve_containing_procedure` | C2 | 4 | 4 | 4 |
| `search_procedures` | B | 1 | 1 | 1 |
| `xrefs` | C1 | 1 | 0 | 0 |
| `xrefs` | C2 | 1 | 0 | 0 |

## Tokens and calls per run by condition (medians)

Input tokens are split by type, since cache writes and reads are priced differently and most of the input is cached.

| Condition | Runs | Cost | Turns | Input | Cache writes | Cache reads | Output | rea calls | Repeated rea calls | Input validation failures | Time |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B | 60 | 0.2136 USD | 15 | 26 | 38490 | 305240 | 2344 | 10 | 0 | 3 | 68 s |
| C1 | 60 | 0.2290 USD | 16 | 26 | 39902 | 358010 | 2248 | 8 | 1 | 3 | 71 s |
| C2 | 60 | 0.2417 USD | 16 | 26 | 43328 | 367835 | 2728 | 8 | 0 | 1 | 73 s |

## rea usage and Evidence (conditions B, C1 and C2)

| Condition | Used rea | First call open_binary | Opened and closed | Repeated calls | Input validation failures | Citations authenticated | Citations about the target | Invented ids | Skill loaded |
|---|---|---|---|---|---|---|---|---|---|
| B | 60/60 (100 %, 94 %-100 %) | 60/60 (100 %, 94 %-100 %) | 59/60 (98 %, 91 %-100 %) | 0 | 3 | 120/120 | 120/120 | 0 | 0/60 (0 %, 0 %-6 %) |
| C1 | 60/60 (100 %, 94 %-100 %) | 60/60 (100 %, 94 %-100 %) | 59/60 (98 %, 91 %-100 %) | 1 | 3 | 120/120 | 120/120 | 0 | 0/60 (0 %, 0 %-6 %) |
| C2 | 60/60 (100 %, 94 %-100 %) | 60/60 (100 %, 94 %-100 %) | 53/60 (88 %, 78 %-94 %) | 0 | 1 | 120/120 | 120/120 | 0 | 0/60 (0 %, 0 %-6 %) |

## Answered address in the cited Evidence (conditions B, C1 and C2)

Runs whose answer_address cites an authenticated Evidence that states that same address, absolute or relative to the image base. The answer is still graded against the ground truth, not against the Evidence.

| Condition | Runs with an address | Address in the cited Evidence | Of those, correct |
|---|---|---|---|
| B | 60 | 18 | 17 |
| C1 | 60 | 19 | 19 |
| C2 | 60 | 20 | 19 |

## Runs flagged for review

- r04-x64-O2-strip-C2-r1: outside paths `~/\tjae\t/)jae++`
- r05-x64-O2-strip-B-r2: outside paths `Bash: parent folder`
- r05-x64-O2-strip-C1-r1: execution attempts `cd <home>/AppData/Local/rea-lab-bench/runs/study-5/r05-x64-O2-strip-C1-r1/work; python -I -c "
d=open('target.exe','rb').read()
import struct
for name,pat in [('lwlmask',struct.pack('<4I',0x00ffffff,0xffff,0xff,0)),('lwrmask',struct.pack('<4I',0,0xff000000,0xffff0000,0xffffff00)),('shift',struct.pack('<4I',24,16,8,0))]:
  i=-1
  while True:
    i=d.find(pat,i+1)
    if i<0:break
    print(name,hex(i))
"; llvm-readobj --file-headers target.exe | grep -i imagebase; llvm-objdump -h target.exe | head -20`
- r08-x64-O2-strip-B-r1: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-5/r08-x64-O2-strip-B-r1/claude-config/projects/"*/*/tool-results/ && python -I -c "
import json,sys
d=json.load(open([f for f in __import__('os').listdir('.') if 'pseudo' in f][0]))
print(d['raw_result']['value'][:3500])"`
- r11-x64-O2-strip-B-r2: outside paths `~/../../../../../../../../../tmp_pc.txt`, `Bash: parent folder`
- r16-x64-O2-strip-C2-r2: outside paths `<home>/AppData/Local/rea-lab-bench/runs/study-5/r16-x64-O2-strip-C2-r2/`
- r19-x64-O2-strip-B-r1: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-5/r19-x64-O2-strip-B-r1/work"; python -I -c "
import json,sys
d=json.load(open(sys.argv[1]))
print(len(d['normalized_result']),d['normalized_result'][:3])
" "<home>/AppData/Local/rea-lab-bench/runs/study-5/r19-x64-O2-strip-B-r1/claude-config/projects/<home>-AppData-Local-rea-lab-bench-runs-study-5-r19-x64-O2-strip-B-r1-work/42e9d4d4-119f-415b-8faa-3846ec34fb33/tool-results/mcp-rea-list_procedures-1792239556655.txt"`
- r20-x64-O2-strip-C1-r2: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-5/r20-x64-O2-strip-C1-r2/claude-config/projects/"*/*/tool-results/; python -I -c "
import json
d=json.load(open('mcp-rea-list_procedures-1792236324146.txt'))
r=d['normalized_result']
print(len(r)); print(r[:3])
" ; llvm-objdump -d --no-show-raw-insn <home>/AppData/Local/rea-lab-bench/runs/study-5/r20-x64-O2-strip-C1-r2/work/target.exe > <home>/AppData/Local/rea-lab-bench/runs/study-5/r20-x64-O2-strip-C1-r2/work/dis.txt; wc -l <home>/AppData/Local/rea-lab-bench/runs/study-5/r20-x64-O2-strip-C1-r2/work/dis.txt`
- r24-x64-O2-strip-C2-r1: execution attempts `cd "<home>/AppData/Local/rea-lab-bench/runs/study-5/r24-x64-O2-strip-C2-r1/claude-config/projects/<home>-AppData-Local-rea-lab-bench-runs-study-5-r24-x64-O2-strip-C2-r1-work/d079ee62-8ebf-4b00-ae64-a880ad22ca84/tool-results/" && python -I -c "
import json,sys
v=json.load(open('mcp-rea-procedure_pseudo_code-1792231254535.txt'))['raw_result']['value']
open('<home>/AppData/Local/rea-lab-bench/runs/study-5/r24-x64-O2-strip-C2-r1/work/main.c','w').write(v)
print(len(v.splitlines()))"; tail -50 "<home>/AppData/Local/rea-lab-bench/runs/study-5/r24-x64-O2-strip-C2-r1/work/main.c"`
- r25-x64-O2-strip-B-r2: execution attempts `llvm-strings -a target.exe | grep -iE "wren|lua|mruby|duk_|quickjs|gravity|squirrel|ruby|python" | head -20`
- r25-x64-O2-strip-C1-r1: execution attempts `ls; llvm-strings -t x target.exe | grep -i -E "lua|python|ruby|intern|symbol" | head -30`
- r25-x64-O2-strip-C2-r2: execution attempts `ls; llvm-strings -t x target.exe | grep -i -E "intern|lua|python|mruby|ruby|wren|duk" | head -30`
- r27-x64-O2-strip-C1-r1: execution attempts `llvm-strings -n 6 target.exe | grep -iE "lua|duk_|wren|squirrel|python|mujs|quickjs|ruby" | head -30`
- r28-x64-O2-strip-B-r2: execution attempts `python -I - <<'E'
d=open('target.exe','rb').read()
import re
for name,p in [('sha256K',bytes.fromhex('982f8a42')),('sha1',bytes.fromhex('9979825a')),('sha512K',bytes.fromhex('22ae28d7982f8a42')),('md5',bytes.fromhex('78a46ad7')),('sha256iv',bytes.fromhex('67e6096a'))]:
    print(name,[hex(m.start()) for m in re.finditer(re.escape(p),d)])
E`
- r28-x64-O2-strip-C2-r1: execution attempts `python -I - <<'E'
import re
d=open('target.exe','rb').read()
for n,p in [('k256',bytes.fromhex('982f8a42')),('h256',bytes.fromhex('67e6096a')),('sha1k',bytes.fromhex('99795a82')),('md5',bytes.fromhex('78a46ad7')),('sha512',bytes.fromhex('22ae28d7'))]:
    print(n,[hex(m.start()) for m in re.finditer(re.escape(p),d)])
E
grep -n -i -E "0x(5a827999|6ed9eba1|8f1bbcdc|ca62c1d6|d76aa478|428a2f98|e9b5dba5)" dis.txt | head`
- r29-x64-O2-strip-C2-r1: execution attempts `grep -n -E "call.*(140042890|1400429c0)|jmp.*(140042890|1400429c0)" dis.txt | awk -F'[: ]+' '{print $2}' | python -I -c "
import sys
a=[int(x,16) for x in sys.stdin.read().split()]
for i in range(len(a)-2):
    if a[i+2]-a[i]<0x40: print(hex(a[i]),hex(a[i+1]),hex(a[i+2]))
"`
