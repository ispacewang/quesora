export function shouldShowAiJudgeButton({
  aiMode,
  shortAnswer,
  fillBlank,
  showResult,
}) {
  return Boolean(aiMode && (shortAnswer || fillBlank) && !showResult)
}
