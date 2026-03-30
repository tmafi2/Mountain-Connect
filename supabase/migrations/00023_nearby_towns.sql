-- ═══ NEARBY TOWNS ══════════════════════════════════════════

-- Towns near ski resorts where seasonal workers typically live
CREATE TABLE IF NOT EXISTS nearby_towns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  state TEXT,
  country TEXT,
  latitude FLOAT8,
  longitude FLOAT8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join table: many-to-many between resorts and nearby towns
CREATE TABLE IF NOT EXISTS resort_nearby_towns (
  resort_id UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  town_id UUID NOT NULL REFERENCES nearby_towns(id) ON DELETE CASCADE,
  distance_km INT,
  PRIMARY KEY (resort_id, town_id)
);

CREATE INDEX idx_resort_nearby_towns_resort ON resort_nearby_towns(resort_id);
CREATE INDEX idx_resort_nearby_towns_town ON resort_nearby_towns(town_id);

-- ═══ ROW LEVEL SECURITY ════════════════════════════════════

ALTER TABLE nearby_towns ENABLE ROW LEVEL SECURITY;
ALTER TABLE resort_nearby_towns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access on nearby_towns"
  ON nearby_towns FOR SELECT USING (true);

CREATE POLICY "Public read access on resort_nearby_towns"
  ON resort_nearby_towns FOR SELECT USING (true);

-- ═══ SEED DATA ═════════════════════════════════════════════

-- Jindabyne
INSERT INTO nearby_towns (name, slug, description, state, country, latitude, longitude)
VALUES (
  'Jindabyne',
  'jindabyne',
  'The closest town to both Thredbo and Perisher, Jindabyne is where most seasonal workers live. It has supermarkets, restaurants, accommodation, and a lively après scene — all within 30–45 mins of the resorts.',
  'NSW',
  'Australia',
  -36.4165,
  148.6233
);

-- Link Jindabyne to Thredbo (~35 km)
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km)
VALUES (
  (SELECT id FROM resorts WHERE legacy_id = '52' LIMIT 1),
  (SELECT id FROM nearby_towns WHERE slug = 'jindabyne' LIMIT 1),
  35
);

-- Link Jindabyne to Perisher (~30 km)
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km)
VALUES (
  (SELECT id FROM resorts WHERE legacy_id = '50' LIMIT 1),
  (SELECT id FROM nearby_towns WHERE slug = 'jindabyne' LIMIT 1),
  30
);
