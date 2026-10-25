# Paid-unlock experiment ($1.99 to reveal a result)

For a short, fixed time, a visitor scans a major as usual (and hears the usual meme sound), then sees the result card **locked**
and pays **$1.99** (GHS 18.70 in Ghana) to reveal the score, roast and card. When the time is up the site goes back to free
results **by itself**. It is **off** unless you switch it on.

## Switch it on (the 48 hours start when YOU do this, not when the code was written)

1. Run `npm run unlock:window` (it only prints two lines). It starts the clock in 10 minutes and runs 48 hours.
2. In Vercel (Settings > Environment Variables, Production) add the two values it printed:
   `UNLOCK_EXPERIMENT_START` and `UNLOCK_EXPERIMENT_END`.
3. Redeploy (Vercel only applies new variables to a new deployment). From START, results are locked.

`UNLOCK_GHS_MINOR` (optional) is the cedi price in pesewas for visitors paying through Paystack. Default `1870` = GHS 18.70
(about $1.99 at the rate behind the GHS 46.90 plan). Dollars (Stripe) are always exactly $1.99, set in the code, never by the browser.

## It ends by itself, and how to stop it early

- **End:** after `UNLOCK_EXPERIMENT_END` the server stops asking for payment on the next page load, and everything is free again.
  A page someone left open past the end also treats the result as free. Someone who paid just before the end still gets what they paid for.
- **Stop now:** delete `UNLOCK_EXPERIMENT_START` in Vercel and redeploy (or set the end to a past time).
- **Safety:** a window longer than 7 days, or an end before the start, is ignored (off). A typo cannot leave a permanent paywall.
- Nothing was removed: the free result is the normal code path. The experiment is a lock in front of it (`UnlockGate`).
- The private payments gate (`PAYMENTS_PREVIEW_KEY`) is respected: while it is closed, only the owner's browser sees the experiment.
  That is the way to try it on the real site before the public sees it.

## What a visitor sees

1. Before scanning there is no notice (the owner removed it on 2026-10-25, once the experiment was confirmed working; it was shown in the hero and under the search box). The mobile hero line just drops the word "free" while the experiment runs.
2. They scan; the meme sound plays at the usual moment; the card appears **masked** (blurred stand-ins, the real score and roast are not on the page).
3. The paywall: "YOUR MAJOR HAS BEEN JUDGED." with your copy, an email field (only for the provider's receipt) and **UNLOCK MY RESULTS — $1.99**.
4. They pay on Stripe or Paystack (a fake checkout in test mode), come back, the server asks the provider, and only then the full result opens.
5. A signed cookie (`cm_unlock`, one year) remembers it per major, so a refresh or a later visit does not ask again. A lost cookie can be restored with the payment reference ("Already paid? Restore your result").

Owning the Survival Plan for a major also opens its result. A plan purchase and a result unlock are separate products: neither opens the other.

## How it is protected

- The price is chosen by the server when the payment starts. Verification asks the provider for that exact reference, major, product (`major-intelligence-result-unlock`) and amount; a plan payment cannot be used as an unlock or the reverse, and a payment for one major cannot unlock another.
- Only `/api/unlock/verify` writes the unlock cookie, only after the provider says paid. It is signed and bound to its own name; editing or copying cookies does nothing.
- Webhooks (Stripe, Paystack) record an unlock purchase even if the buyer never came back. A refund (webhook) takes the unlock away.
- Duplicate callbacks are safe (the purchase is recorded once). Declined, cancelled, pending, expired and refunded payments never unlock.
- During the experiment `/api/extended` and `/api/leads` (they return the score) also require the unlock; the tab title and preview card of a `?major=` link no longer show the score.
- Purchases are recorded in the `purchases` table with `major_slug = "unlock:<slug>"`, so they can never be mistaken for a plan.

## Analytics (GA4)

Every event carries `experiment=paid_unlock_199_v1`, `variant=paywall`, an anonymous `assessment_id` (random, per scan, not tied to a person) and `client_ts`:

`assessment_started`, `assessment_completed`, `paywall_viewed`, `unlock_checkout_clicked`, `payment_succeeded`, `payment_failed`, `result_unlocked`, `result_shared`.

Revenue is the normal `purchase` event (item `major-intelligence-result-unlock`, value 1.99 or 18.70 GHS), or `test_purchase` in test mode and behind the private gate. Telegram also gets "Unlock payment started", the purchase alert ("Result unlock (experiment)") and failures. No email addresses anywhere.

To read it: GA4 > Explore > funnel on the events above, filtered by `experiment`. Conversion = `payment_succeeded` / `paywall_viewed`. Revenue per visitor = purchase revenue / visitors in the window. The effect on sharing = `result_shared` per `assessment_completed` against the weeks before.

## Files

New: `src/lib/unlock/*` (config, cookie, access, view, alerts, analytics, shared), `src/app/api/unlock/{status,initialize,verify,mock}/route.ts`, `src/components/unlock/unlock-gate.tsx`, `scripts/unlock-window.mjs`.
Changed: `payments/{types,paystack,stripe,mock,purchases,gate}.ts` and both webhooks (an `unlock` product alongside plan and bundle), `app/page.tsx`, `HomeClient.tsx`, `hero.tsx`, `sample-result-card.tsx`, `api/extended`, `api/leads`, privacy and refunds pages, `package.json`.

## Known limits (be aware before you read the numbers)

- **The lock hides the result in the page; it is not secret data.** All scores ship in the site's JavaScript and also appear on the leaderboard, the Compare page, the hero's five sample results and `/share/<major>` pages. Someone determined can find a score without paying. For this experiment that is acceptable (it measures willingness to pay). If you need a hard lock, those places would have to be closed during the window too.
- Traffic is about 25 scans a day, so 48 hours is only about 50 paywall views: a handful of sales either way is noise, not proof.
- The free scan is advertised elsewhere (TrustMRR, the sponsor slot, search results, the ambassador page). During the window it is not free.
