// Shared "is this screening in the past?" check, used by both the public
// screenings list and the public groups list so requesting a group and
// browsing groups to join never surface stale, already-happened showtimes.
//
// screening_date is a plain ISO date string (YYYY-MM-DD), which sorts
// correctly with plain string comparison — no need to parse into Date
// objects (and no timezone footguns from doing so).
//
// Rows with no screening_date at all (older manual entries predating this
// column) are treated as upcoming rather than hidden, since we don't
// actually know they're in the past.
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function isUpcoming(screeningDate) {
  if (!screeningDate) return true;
  return screeningDate >= todayIso();
}
