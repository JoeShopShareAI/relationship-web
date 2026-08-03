// Distinct from RelationshipNode.tsx's palette on purpose: that component uses #ee5524
// (selected) and #1d9e75 (focal) as *state* colors on the force graph. These are per-*type*
// colors shown side-by-side with that view via the App.tsx toggle, so they deliberately avoid
// both hues to prevent a color meaning something different in each view.
export const TYPE_COLORS: Record<string, string> = {
  family: '#c97b4a',
  best_friend: '#3f6fb8',
  friend: '#6f9bd8',
  colleague: '#4a9b8e',
  neighbor: '#9b7fc9',
  mentor_mentee: '#c9a34a',
  romantic: '#d1618f',
  classmate_alumni: '#7c8fae',
  manager_report: '#8f6a9b',
}

export const TYPE_LABELS: Record<string, string> = {
  family: 'Family',
  best_friend: 'Best friend',
  friend: 'Friend',
  colleague: 'Colleague',
  neighbor: 'Neighbor',
  mentor_mentee: 'Mentor/mentee',
  romantic: 'Romantic',
  classmate_alumni: 'Classmate',
  manager_report: 'Manager/report',
}

export const DEFAULT_TYPE_COLOR = '#8a7f70'
