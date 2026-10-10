import { test } from "node:test";
import assert from "node:assert/strict";
import { guideSlugsFor } from "./related-guides";

test("a country page leads with the guide written about that country", () => {
  const au = guideSlugsFor({ kind: "country", country: "Australia" });
  assert.equal(au[0], "australian-working-holiday-visa-ski-season");
  const ca = guideSlugsFor({ kind: "country", country: "Canada" });
  assert.ok(ca[0].includes("canada"), ca[0]);
});

test("a country with no guide of its own still gets the general ones", () => {
  const fr = guideSlugsFor({ kind: "country", country: "France" });
  assert.equal(fr.length, 3);
  // Nothing France-specific exists, so these must all be country-agnostic.
  assert.ok(!fr.some((s) => /canada|australia|japan|new-zealand/.test(s)), fr.join(","));
});

test("'USA' and 'United States' are the same country", () => {
  assert.deepEqual(
    guideSlugsFor({ kind: "country", country: "USA" }),
    guideSlugsFor({ kind: "country", country: "United States" })
  );
});

test("a town page gets the guides about living somewhere, not about a country", () => {
  const town = guideSlugsFor({ kind: "town" });
  assert.ok(town.length > 0);
  assert.ok(!town.some((s) => /australia|canada|japan|new-zealand/.test(s)), town.join(","));
});

test("the limit is honoured, because these sit at the end of a long page", () => {
  assert.equal(guideSlugsFor({ kind: "country", country: "Canada" }, 2).length, 2);
  assert.equal(guideSlugsFor({ kind: "town" }, 1).length, 1);
});

// ⚠️ Linking a 350-word post from 200+ pages puts the site's weight behind
// its thinnest page. These three stay out until they are rewritten.
test("the three thin posts are not promoted anywhere", () => {
  const thin = [
    "first-ski-season-survival-guide",
    "australian-ski-season-packing-list",
    "how-to-land-your-first-ski-resort-job",
  ];
  const everywhere = [
    ...guideSlugsFor({ kind: "town" }, 99),
    ...["Australia", "Canada", "Japan", "New Zealand", "France"].flatMap((c) =>
      guideSlugsFor({ kind: "country", country: c }, 99)
    ),
  ];
  for (const t of thin) assert.ok(!everywhere.includes(t), `${t} is linked`);
});

test("no slug is offered twice on one page", () => {
  for (const c of ["Canada", "Australia", "Japan"]) {
    const got = guideSlugsFor({ kind: "country", country: c }, 99);
    assert.equal(new Set(got).size, got.length, c);
  }
});

// Canada has three posts of its own and over half the open board. Before the
// cap it filled every slot with them, so the country most readers are looking
// at never saw the general guides.
test("country-specific guides lead but never fill the list", () => {
  const ca = guideSlugsFor({ kind: "country", country: "Canada" }, 3);
  assert.equal(ca.length, 3);
  assert.ok(ca[0].includes("canada"), ca[0]);
  const general = ca.filter((s) => !/canada|australia|japan|new-zealand/.test(s));
  assert.ok(general.length >= 1, `no general guide survived: ${ca.join(", ")}`);
});
