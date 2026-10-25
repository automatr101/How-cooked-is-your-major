// Prints the two settings that run the paid-unlock experiment for 48 hours (see UNLOCK-EXPERIMENT.md).
//
//   npm run unlock:window                       starts in 10 minutes (time for the deploy), runs 48 hours
//   npm run unlock:window -- 2026-10-28T12:00:00Z       starts at that time instead
//   npm run unlock:window -- now 24             starts in 10 minutes, runs 24 hours (at most 168)
//
// It only prints. Paste the two values into Vercel (Settings > Environment Variables), redeploy, and the clock runs from START.

const [startArg, hoursArg] = process.argv.slice(2);
const hours = Number(hoursArg ?? 48);
if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
  console.error("Hours must be between 1 and 168 (the site ignores a longer window on purpose).");
  process.exit(1);
}
const start = !startArg || startArg === "now" ? new Date(Date.now() + 10 * 60 * 1000) : new Date(startArg);
if (Number.isNaN(start.getTime())) {
  console.error(`Not a valid time: ${startArg}. Use something like 2026-10-28T12:00:00Z`);
  process.exit(1);
}
const end = new Date(start.getTime() + hours * 3600 * 1000);

console.log(`\nPaste these two into Vercel, then redeploy:\n`);
console.log(`UNLOCK_EXPERIMENT_START=${start.toISOString()}`);
console.log(`UNLOCK_EXPERIMENT_END=${end.toISOString()}`);
console.log(`\nResults get a $1.99 lock from the START time and free results come back by themselves at the END time (${hours} hours).`);
console.log(`To stop early: delete UNLOCK_EXPERIMENT_START in Vercel and redeploy.\n`);
