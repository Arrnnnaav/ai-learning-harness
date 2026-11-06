// Minimal SM-2-style spaced repetition. Two grades only (Again / Good) —
// full SM-2's 0-5 scale is overkill for a "was this answer useful to revisit" card.
const DAY_MS = 24 * 60 * 60 * 1000;

function newCard(now = Date.now()) {
  return { interval: 0, ease: 2.5, reps: 0, due: now };
}

function gradeCard(card, grade, now = Date.now()) {
  let { interval, ease, reps } = card;
  if (grade === 'again') {
    reps = 0;
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.round(interval * ease) || 1;
    ease = Math.min(2.8, ease + 0.1);
  }
  return { interval, ease, reps, due: now + interval * DAY_MS };
}

module.exports = { newCard, gradeCard };
