import type { User, Rating } from '../types'

export const SEED_CURRENT_USER_ID = 'alice'

// eligible_tool_count is illustrative only — in a real pooledTools integration the host would
// compute this per person by calling its own policy.engine.evaluate() (or aggregating
// /community/tools by owner), not relationshipWeb. Mixing all three states here (undefined,
// null, a real number) on purpose so the dev harness actually exercises each one.
export const SEED_USERS: User[] = [
  { id: 'alice',  display_name: 'Alice Chen',    host_user_id: 'h-alice',  notes: 'Focal user in this demo' },
  { id: 'bob',    display_name: 'Bob Martinez',  host_user_id: 'h-bob',    eligible_tool_count: 3 },
  { id: 'carol',  display_name: 'Carol Chen',    host_user_id: 'h-carol', notes: "Alice's sister", eligible_tool_count: 0 },
  { id: 'david',  display_name: 'David Kim',     host_user_id: 'h-david',  eligible_tool_count: null },
  { id: 'emma',   display_name: 'Emma Williams', host_user_id: 'h-emma',   eligible_tool_count: 1 },
  { id: 'frank',  display_name: 'Frank Johnson', host_user_id: 'h-frank' },
  { id: 'sarah',  display_name: 'Sarah Lee',     host_user_id: 'h-sarah',  eligible_tool_count: 2 },
  { id: 'tom',    display_name: 'Tom Brown',     host_user_id: 'h-tom',    eligible_tool_count: null },
  { id: 'lisa',   display_name: 'Lisa Park',     host_user_id: 'h-lisa' },
  { id: 'mike',   display_name: 'Mike Davis',    host_user_id: 'h-mike',   eligible_tool_count: 1 },
]

// Connections from multiple owners so client-side picker BFS can traverse 2 hops.
// The graph canvas only displays connections owned by the selected focal user;
// all connections are available for picker BFS traversal.
export const SEED_CONNECTIONS: Array<{
  id: number
  owner_user_id: string
  target_user_id: string
  types: string[]
}> = [
  // Alice's direct connections (hop 1 from alice)
  { id: 1,  owner_user_id: 'alice', target_user_id: 'bob',   types: ['best_friend', 'colleague'] },
  { id: 2,  owner_user_id: 'alice', target_user_id: 'carol', types: ['family'] },
  { id: 3,  owner_user_id: 'alice', target_user_id: 'david', types: ['colleague', 'mentor_mentee'] },
  { id: 4,  owner_user_id: 'alice', target_user_id: 'emma',  types: ['friend'] },
  { id: 5,  owner_user_id: 'alice', target_user_id: 'frank', types: ['neighbor'] },
  // Bob's connections — hop 2 via alice → bob
  { id: 6,  owner_user_id: 'bob',   target_user_id: 'sarah', types: ['romantic'] },
  { id: 7,  owner_user_id: 'bob',   target_user_id: 'tom',   types: ['friend', 'classmate_alumni'] },
  { id: 8,  owner_user_id: 'bob',   target_user_id: 'alice', types: ['best_friend', 'colleague'] },
  // David's connections — hop 2 via alice → david
  { id: 9,  owner_user_id: 'david', target_user_id: 'lisa',  types: ['colleague'] },
  { id: 10, owner_user_id: 'david', target_user_id: 'mike',  types: ['colleague', 'manager_report'] },
  { id: 11, owner_user_id: 'david', target_user_id: 'alice', types: ['colleague', 'mentor_mentee'] },
]

export const SEED_RATINGS: Rating[] = [
  // Alice rates her connections
  { id: 1,  rated_user_id: 'bob',   rater_user_id: 'alice', dimension_key: 'borrower', score: 4.5, notes: 'Super reliable',           created_at: '2024-01-15T00:00:00' },
  { id: 2,  rated_user_id: 'bob',   rater_user_id: 'alice', dimension_key: 'lender',   score: 3.5, notes: null,                       created_at: '2024-01-15T00:00:00' },
  { id: 3,  rated_user_id: 'carol', rater_user_id: 'alice', dimension_key: 'borrower', score: 5.0, notes: 'Perfect track record',      created_at: '2024-01-10T00:00:00' },
  { id: 4,  rated_user_id: 'carol', rater_user_id: 'alice', dimension_key: 'lender',   score: 5.0, notes: null,                       created_at: '2024-01-10T00:00:00' },
  { id: 5,  rated_user_id: 'david', rater_user_id: 'alice', dimension_key: 'lender',   score: 4.0, notes: null,                       created_at: '2024-02-01T00:00:00' },
  { id: 6,  rated_user_id: 'emma',  rater_user_id: 'alice', dimension_key: 'borrower', score: 3.0, notes: 'Usually good, sometimes slow', created_at: '2024-02-15T00:00:00' },
  // Others rate alice
  { id: 7,  rated_user_id: 'alice', rater_user_id: 'bob',   dimension_key: 'borrower', score: 4.0, notes: null, created_at: '2024-01-20T00:00:00' },
  { id: 8,  rated_user_id: 'alice', rater_user_id: 'carol', dimension_key: 'lender',   score: 4.5, notes: null, created_at: '2024-01-20T00:00:00' },
  { id: 9,  rated_user_id: 'alice', rater_user_id: 'emma',  dimension_key: 'lender',   score: 4.0, notes: null, created_at: '2024-02-20T00:00:00' },
  // 2nd-hop ratings visible to alice
  { id: 10, rated_user_id: 'sarah', rater_user_id: 'bob',   dimension_key: 'borrower', score: 4.0, notes: null, created_at: '2024-03-01T00:00:00' },
  { id: 11, rated_user_id: 'lisa',  rater_user_id: 'david', dimension_key: 'borrower', score: 4.5, notes: null, created_at: '2024-03-05T00:00:00' },
  { id: 12, rated_user_id: 'mike',  rater_user_id: 'david', dimension_key: 'borrower', score: 3.5, notes: null, created_at: '2024-03-05T00:00:00' },
]

export const SEED_RATING_DIMENSIONS = [
  { key: 'borrower', label: 'Borrower' },
  { key: 'lender',   label: 'Lender' },
]

export const SEED_DATA = {
  users: SEED_USERS,
  connections: SEED_CONNECTIONS,
  ratings: SEED_RATINGS,
}
