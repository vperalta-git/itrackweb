export function getChecklistCompletion(checklist: readonly { completed: boolean }[] = []) {
  const completed = checklist.filter((item) => item.completed).length
  return { completed, total: checklist.length, progress: checklist.length ? Math.round(completed / checklist.length * 100) : 0 }
}
