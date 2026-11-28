/**
 * How a country's resorts are grouped in the explore panel.
 *
 * ⚠️ A FLAT LIST OF TWENTY-FOUR CHIPS IS NOT A LIST ANYONE READS. The panel
 * prints every resort in the selected country as one alphabetical run, so
 * Canada's twenty-four and Japan's nineteen arrive as an undifferentiated
 * wall — and the thing a seasonal worker is actually deciding is WHERE, which
 * the alphabet actively hides: Banff's three resorts are scattered through
 * the Bs, Ls and Ss with Quebec in between.
 *
 * ⚠️ IT NEEDS NO NEW DATA. `state_province` is populated on all 125 resorts
 * in lib/data/resorts.ts — Alberta, Hokkaido, South Tyrol, Otago — so this is
 * presentation, not research, and nothing here invents a region for a resort
 * that does not state one.
 */

export interface GroupableResort {
  id: string;
  name: string;
  country: string;
  state_province: string | null;
}

export interface ResortGroup {
  label: string;
  resorts: { id: string; name: string }[];
}

/**
 * New Zealand's ski fields are talked about by island, not by region.
 *
 * ⚠️ THIS IS A MAP, NOT A GUESS, AND IT FALLS BACK RATHER THAN MISLABELS. The
 * data holds Canterbury, Otago and Manawatu-Whanganui; a New Zealander asks
 * whether a field is in the North or the South Island, which is the division
 * that decides the drive, the season and the town. A region added later that
 * is not in this map keeps its own name rather than being assigned to an
 * island on the strength of nothing.
 */
const NZ_ISLANDS: Record<string, string> = {
  "Auckland": "North Island",
  "Bay of Plenty": "North Island",
  "Gisborne": "North Island",
  "Hawke's Bay": "North Island",
  "Manawatu-Whanganui": "North Island",
  "Northland": "North Island",
  "Taranaki": "North Island",
  "Waikato": "North Island",
  "Wellington": "North Island",
  "Canterbury": "South Island",
  "Marlborough": "South Island",
  "Nelson": "South Island",
  "Otago": "South Island",
  "Southland": "South Island",
  "Tasman": "South Island",
  "West Coast": "South Island",
};

/** What a single resort is filed under. */
export function groupLabelFor(resort: GroupableResort): string | null {
  const region = resort.state_province;
  if (!region) return null;
  if (resort.country === "New Zealand") return NZ_ISLANDS[region] ?? region;
  return region;
}

/**
 * A country's resorts, grouped and sorted, or a single unlabelled group.
 *
 * ⚠️ ONE GROUP IS NO GROUPING. Andorra's one resort has `state_province:
 * "Andorra"`, so grouping it would print the country's name as a heading
 * inside a panel already titled with the country's name; Austria's five are
 * all in Tyrol, Sweden's one in Jämtland. A heading that every item shares
 * tells the reader nothing and costs a line each time. Those countries get
 * one group with a null label, which the panel renders as a plain list
 * exactly as it does today.
 */
export function groupResorts(resorts: GroupableResort[]): ResortGroup[] {
  const byLabel = new Map<string, { id: string; name: string }[]>();
  let ungrouped = 0;

  for (const r of resorts) {
    const label = groupLabelFor(r);
    if (label === null) ungrouped++;
    const key = label ?? "";
    const list = byLabel.get(key) ?? [];
    list.push({ id: r.id, name: r.name });
    byLabel.set(key, list);
  }

  // ⚠️ A country where some resorts have a region and some do not would
  // otherwise print a headless group beside headed ones, which reads as a
  // rendering fault rather than as missing data. All 125 resorts carry a
  // region today; this is what happens the day one does not.
  if (byLabel.size <= 1 || ungrouped > 0) {
    return [
      {
        label: "",
        resorts: [...resorts]
          .map((r) => ({ id: r.id, name: r.name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      },
    ];
  }

  return [...byLabel.entries()]
    .map(([label, list]) => ({
      label,
      resorts: list.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    // Most resorts first: the region a visitor is most likely to want is the
    // one with the most work in it, and it reads better than the alphabet
    // putting Alberta's four above British Columbia's fourteen.
    .sort((a, b) => b.resorts.length - a.resorts.length || a.label.localeCompare(b.label));
}
