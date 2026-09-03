import { test } from "node:test";
import assert from "node:assert/strict";
import { prefilter } from "./prefilter";

const sends = (text: string, hasImages = false) => prefilter(text, hasImages).send;

/**
 * The trap this filter exists to avoid. "Accommodation" is the single most
 * common reason the model gives for rejecting a post, and it is also in a
 * large share of the genuine ads, because staff housing is the main perk a
 * ski job offers. Getting this wrong loses the best listings on the board.
 */
test("a job ad that mentions accommodation is still sent", () => {
  assert.equal(sends("Chef wanted for the winter season. Staff accommodation provided, lift pass included."), true);
  assert.equal(sends("Housekeeper needed in Niseko — accommodation and season pass included"), true);
  assert.equal(sends("Now hiring lift operators. Shared room in staff housing, meals on shift."), true);
});

test("somebody looking for a room is dropped", () => {
  assert.equal(sends("Looking for accommodation in Hakuba for the season, two of us, budget flexible"), false);
  assert.equal(sends("Spare room available in Jindabyne from December, $200pw, message me"), false);
});

/**
 * A role named without the word "hiring" is the commonest shape of a real
 * ad, and the easiest kind to lose.
 */
test("an ad that never says 'hiring' is still recognised by the role", () => {
  assert.equal(sends("Sous chef, 40hrs, $32/hr, start December. DM for details."), true);
  assert.equal(sends("Barista needed at our cafe in Nozawa from mid Dec"), true);
  assert.equal(sends("Ski instructor positions for the 26/27 season"), true);
});

test("gear sales are dropped", () => {
  assert.equal(sends("Selling my Burton board, barely used, $300 ono, pick up only in Queenstown"), false);
  assert.equal(sends("Salomon boots size 27 for sale, brand new never worn"), false);
});

/**
 * Job seekers advertising themselves. Dropped for cost, and also the posts
 * we deliberately do not process at all.
 */
test("people looking for work are dropped, not imported", () => {
  assert.equal(sends("Looking for work in Niseko this season, 5 years hospitality experience, my CV is attached"), false);
  assert.equal(sends("Is anyone hiring? Available from November, happy to do anything"), false);
});

test("questions, chat and admin are dropped", () => {
  assert.equal(sends("Does anyone know a good place to get skis serviced in town?"), false);
  assert.equal(sends("Any recommendations for a physio in Hakuba?"), false);
  assert.equal(sends("Closing party at the Barn this Saturday, everyone welcome!"), false);
});

/**
 * A poster graphic with no caption is a real and common shape for a ski job
 * ad. Judging it from its text would throw it away — sending it to a model
 * that can read the image is the entire reason images are downloaded.
 */
test("an image-only post always goes through", () => {
  assert.equal(sends("", true), true);
  assert.equal(sends("👀🎿", true), true);
  assert.equal(sends("see poster", true), true);
});

test("an empty post with no image is not worth a call", () => {
  assert.equal(sends(""), false);
  assert.equal(sends("🎿🎿🎿"), false);
});

/**
 * Step 3: anything unrecognised is sent. The model is better at this than
 * a word list, and a missed job is invisible while a wasted call is not.
 */
test("an ambiguous post defaults to being sent", () => {
  assert.equal(sends("Big changes coming at the lodge this season, watch this space, exciting times ahead"), true);
  assert.equal(sends("We have a few spots left on the team for the upcoming winter"), true);
});

test("word boundaries hold — 'server' must not match 'observer'", () => {
  assert.equal(sends("An observer noted the snow was good, does anyone know when the lifts open"), false);
  assert.equal(sends("Server needed for our restaurant, apply within"), true);
});

test("a dropped post reports the phrase that decided it", () => {
  const v = prefilter("Selling my board, $300 for sale");
  assert.equal(v.send, false);
  assert.ok(v.reason, "the run log should be able to say why");
});
