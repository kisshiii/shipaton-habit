# KATSU

*A voice from the you who believed.*

A habit app built to make itself unnecessary. You set a few daily routines. When
you skip one, the app sends you a notification — **written by you, not by the
app.** After enough days on your own, it asks whether you still need it, and
points you at the cancel button.

Built for RevenueCat Shipaton 2026. iOS only.

## Why it works this way

Most habit apps have their success and their revenue pointing in opposite
directions. You succeed when the habit sticks and you stop opening the app; they
earn when you keep subscribing. So they build streaks you don't want to break,
notifications that pull you back, and guilt when you leave.

KATSU takes the other side of that trade. Graduating is the goal, cancelling is
the win, and the revenue comes from the people who don't graduate — the ones who
restart, or who move on to the next habit.

The other half is the writing. An app telling you to get out of bed is just
another notification. **The words you wrote on the day you decided to change,
delivered to the version of you who is skipping, is a different thing.** So the
app never writes them for you, and if you have written none, it stays silent.

## What is in 1.0

Three screens: routines, today, your words. Everything in the core loop is free —
routines, checking off, notifications, graduation. The paid plan adds more than
one set of words, and different words for different routines.

- **Graduation** is a rolling 30-day window, not a fixed day 30. There is no
  moment where the app tells you that you failed, because that moment never
  exists in the data model. You can also graduate yourself at any time.
- **Notifications** are scheduled ahead and cancelled when you check the item
  off, because a local notification cannot know your state at fire time.
- **Nothing you write leaves the device.** No backend, no analytics on your
  words, not even a log line. The only network calls in the app belong to
  RevenueCat.

## Safety

Writing harsh words to yourself is the point. Writing that you want to hurt
yourself is not, and the line between them matters more than any feature here.

A local check runs before your words are saved. It looks only for self-directed
self-harm and suicidal expressions — a first-person target combined with harm, so
`kill it at the gym` passes and stays yours. When it does catch something, the
app declines to save that text, says one short non-blaming line, offers
[findahelpline.com](https://findahelpline.com), and gets out of the way. It does
not lock you in a modal, it does not repeat itself, and **it never records that
the check fired** — not in storage, not in a log.

The matching list lives in `app/src/config/blocklist.ts` and is deliberately
**not** in this repository; publishing it would just be a guide to writing around
it. See [`app/src/config/README.md`](app/src/config/README.md) for its shape and
for how EAS builds get hold of it.

That check is a floor, not a safety net. It is a static list and it misses a
great deal.

## Running it

You need Node, the Expo tooling, and an iOS device or simulator.

```sh
cd app
npm install
npx expo start
```

Provide `app/src/config/blocklist.ts` first — without it the bundle will not
resolve. `app/src/config/README.md` documents the exports it needs.

Purchases need a RevenueCat publishable key in `app.json` under
`extra.revenueCatApiKey`. Without one the app runs fine and simply behaves as
though nobody has subscribed.

```sh
npx eas build --platform ios --profile production
npx eas submit --platform ios --latest
```

## Layout

```
app/src/
  app/          expo-router screens: today, routines, your words
  components/   onboarding, paywall, graduation, the self-harm notice
  lib/          notifications, graduation window, purchases, the Tier 1 check
  storage/      the only place that talks to AsyncStorage
  constants/    graduation window and threshold, limits, theme
docs/spec.md    every decision, and the rejected alternatives with reasons
CLAUDE.md       the constraints this codebase is built under
```

`docs/spec.md` is the interesting file. It is a record of decisions rather than a
work log, and §9 keeps the ideas that were rejected along with why — which is
usually more useful than the ones that survived.

## Licence

Not yet decided.
