// Types for the parts of rea's JavaScript dist folder that the benchmark imports (rea 6.4.0).

declare module 'rea-agents/dist/domain/evidence.js' {
  /** Validates an Evidence record and recomputes its evidence_id; throws when it does not authenticate. */
  export function parseEvidence(input: unknown): unknown
}

declare module 'rea-agents/dist/evaluation/CodexAgentEval.js' {
  export function evaluateCodexEvents(
    events: readonly unknown[],
    expectedFirstTool: string | null,
    options?: { requiredToolSubsequence?: readonly string[]; requireEvidence?: boolean },
  ): {
    naturalUse: boolean
    firstTool: string | null
    correctFirstTool: boolean
    reaCalls: ReadonlyArray<{ tool: string; error: boolean; errorCode: string | null }>
    repeatedCallCount: number
    inputValidationFailureCount: number
    requiredToolSubsequenceMet: boolean
  }
}
