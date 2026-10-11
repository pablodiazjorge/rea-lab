# How the lab contributes to rea

Status: accepted, amended twice in F4

Claim the issue with a short proposal (open one first when none exists) and start the work right away on a local branch: rea merges most pull requests within hours, so waiting days for an answer means someone else fixes it first. Open the pull request only once it is complete: minimal, with tests, the full template, only commands that were actually run and evidence from real Windows. If the maintainer narrows or rejects the proposal meanwhile, adapt or drop the branch. Keep at most two pull requests open at a time, and open the second only when the two touch no common file and the first is only waiting for the maintainer, not for changes on our side. A pull request closed as superseded with credit counts as a success, and non-code contributions (Windows lane reports, measurements) come first, because the lab's advantage is a Windows machine where rea works.

The first version allowed a single open pull request, a guess made before any contact with the project. The first four interactions showed where the limit really matters and where it only slows things down:

- Review is fast. morluto/rea#1863 was merged about an hour after its CI was approved, and morluto/rea#1926 about an hour after its issue, morluto/rea#1923, was opened. On 11 October 2026, 89 of the last 100 closed pull requests in rea were merged, many within the hour. A pull request rarely waits long, so a strict queue mostly idles.
- The automated review asks for changes within minutes: on morluto/rea#1936 it found that a relative selector passed the preflight and then failed, which was reproduced and fixed with a follow-up commit the same evening. Having to answer that while a third pull request is also in review is what the limit of two protects.
- Overlapping files are the real conflict risk: morluto/rea#1926 and morluto/rea#1936 both edited `docs/testing.md`. Opening them one after the other let the second rebase cleanly, which is why the no-common-file condition stays.
- The maintainer reads these contributions with goodwill ("This is a good one, thank you" on morluto/rea#1926), so one focused extra pull request on different files is unlikely to read as noise, while a burst of them could.
