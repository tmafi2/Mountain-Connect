"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Venue {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  resort_id: string | null;
  nearby_town_id: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  is_primary: boolean;
}

interface ResortOption {
  id: string;
  name: string;
  country: string;
}
interface TownOption {
  id: string;
  name: string;
}

const EMPTY_VENUE: Omit<Venue, "id" | "business_id" | "is_primary"> = {
  name: "",
  slug: "",
  description: null,
  location: null,
  resort_id: null,
  nearby_town_id: null,
  logo_url: null,
  cover_photo_url: null,
  phone: null,
  email: null,
  website: null,
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function BusinessVenuesPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [resorts, setResorts] = useState<ResortOption[]>([]);
  const [towns, setTowns] = useState<TownOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Venue> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) {
        router.push("/business/company-profile");
        return;
      }
      setBusinessId(profile.id);

      const [venuesRes, resortsRes, townsRes] = await Promise.all([
        supabase
          .from("business_venues")
          .select("*")
          .eq("business_id", profile.id)
          .order("is_primary", { ascending: false })
          .order("name"),
        supabase.from("resorts").select("id, name, country").order("name"),
        supabase.from("nearby_towns").select("id, name").order("name"),
      ]);
      setVenues((venuesRes.data ?? []) as Venue[]);
      setResorts((resortsRes.data ?? []) as ResortOption[]);
      setTowns((townsRes.data ?? []) as TownOption[]);
      setLoading(false);
    })();
  }, [router]);

  function openCreate() {
    setEditing({ ...EMPTY_VENUE });
    setError(null);
  }

  function openEdit(v: Venue) {
    setEditing({ ...v });
    setError(null);
  }

  function closeForm() {
    setEditing(null);
    setError(null);
  }

  async function save() {
    if (!businessId || !editing) return;
    if (!editing.name?.trim()) {
      setError("Name is required");
      return;
    }
    const supabase = createClient();
    setSaving(true);
    setError(null);
    const slug = (editing.slug || "").trim() || slugify(editing.name);
    const payload = {
      business_id: businessId,
      name: editing.name.trim(),
      slug,
      description: editing.description?.trim() || null,
      location: editing.location?.trim() || null,
      resort_id: editing.resort_id || null,
      nearby_town_id: editing.nearby_town_id || null,
      logo_url: editing.logo_url?.trim() || null,
      cover_photo_url: editing.cover_photo_url?.trim() || null,
      phone: editing.phone?.trim() || null,
      email: editing.email?.trim() || null,
      website: editing.website?.trim() || null,
    };

    if (editing.id) {
      const { error: err } = await supabase
        .from("business_venues")
        .update(payload)
        .eq("id", editing.id);
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    } else {
      const isFirstVenue = venues.length === 0;
      const { error: err } = await supabase
        .from("business_venues")
        .insert({ ...payload, is_primary: isFirstVenue });
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    }
    await refresh();
    setSaving(false);
    setEditing(null);
  }

  async function refresh() {
    if (!businessId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("business_venues")
      .select("*")
      .eq("business_id", businessId)
      .order("is_primary", { ascending: false })
      .order("name");
    setVenues((data ?? []) as Venue[]);
  }

  async function deleteVenue(v: Venue) {
    if (v.is_primary) {
      setError("Set another venue as primary before deleting this one.");
      return;
    }
    if (!window.confirm(`Delete venue "${v.name}"? Job listings tagged to this venue will lose that link but stay live under the business.`)) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("business_venues")
      .delete()
      .eq("id", v.id);
    if (err) {
      setError(err.message);
      return;
    }
    await refresh();
  }

  async function makePrimary(v: Venue) {
    if (!businessId || v.is_primary) return;
    const supabase = createClient();
    // Unset existing primary first — partial unique index would
    // otherwise reject the new primary while another one exists.
    await supabase
      .from("business_venues")
      .update({ is_primary: false })
      .eq("business_id", businessId)
      .eq("is_primary", true);
    const { error: err } = await supabase
      .from("business_venues")
      .update({ is_primary: true })
      .eq("id", v.id);
    if (err) {
      setError(err.message);
      return;
    }
    await refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-foreground/60">Loading venues…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Venues</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Manage the establishments your business operates. Each venue can have its own location, resort, branding, and job listings.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary/90"
        >
          + Add venue
        </button>
      </div>

      {error && !editing && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {venues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-accent/40 bg-white px-6 py-10 text-center">
            <p className="text-sm text-foreground/60">No venues yet — add your first one.</p>
          </div>
        ) : (
          venues.map((v) => {
            const resort = resorts.find((r) => r.id === v.resort_id);
            const town = towns.find((t) => t.id === v.nearby_town_id);
            return (
              <div
                key={v.id}
                className="flex flex-col gap-3 rounded-xl border border-accent/30 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-bold text-primary">{v.name}</p>
                    {v.is_primary && (
                      <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-foreground/50">
                    {[v.location, town?.name, resort?.name].filter(Boolean).join(" · ") || "No location set"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!v.is_primary && (
                    <button
                      type="button"
                      onClick={() => makePrimary(v)}
                      className="rounded-md border border-accent/40 bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/10"
                    >
                      Make primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(v)}
                    className="rounded-md border border-secondary px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary/5"
                  >
                    Edit
                  </button>
                  {!v.is_primary && (
                    <button
                      type="button"
                      onClick={() => deleteVenue(v)}
                      className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">
                {editing.id ? "Edit venue" : "New venue"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="text-foreground/40 hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-4 space-y-4 text-sm">
              <Field label="Venue name" required>
                <input
                  type="text"
                  value={editing.name ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      name: e.target.value,
                      // Auto-fill slug if it's empty or matches the previous slugified name
                      slug:
                        !editing.slug || editing.slug === slugify(editing.name ?? "")
                          ? slugify(e.target.value)
                          : editing.slug,
                    })
                  }
                  className="w-full rounded-lg border border-accent/40 px-3 py-2"
                  placeholder="e.g. The Avalanche Pub"
                />
              </Field>

              <Field label="URL slug">
                <input
                  type="text"
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                  className="w-full rounded-lg border border-accent/40 px-3 py-2 font-mono text-xs"
                  placeholder="the-avalanche-pub"
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-accent/40 px-3 py-2"
                  placeholder="Short description shown on the venue page."
                />
              </Field>

              <Field label="Location">
                <input
                  type="text"
                  value={editing.location ?? ""}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  className="w-full rounded-lg border border-accent/40 px-3 py-2"
                  placeholder="e.g. 12 Snow Way, Jindabyne NSW"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Resort">
                  <select
                    value={editing.resort_id ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, resort_id: e.target.value || null })
                    }
                    className="w-full rounded-lg border border-accent/40 px-3 py-2"
                  >
                    <option value="">— Use business default —</option>
                    {resorts.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.country})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Nearby town">
                  <select
                    value={editing.nearby_town_id ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, nearby_town_id: e.target.value || null })
                    }
                    className="w-full rounded-lg border border-accent/40 px-3 py-2"
                  >
                    <option value="">— Use business default —</option>
                    {towns.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone">
                  <input
                    type="text"
                    value={editing.phone ?? ""}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                    className="w-full rounded-lg border border-accent/40 px-3 py-2"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={editing.email ?? ""}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    className="w-full rounded-lg border border-accent/40 px-3 py-2"
                  />
                </Field>
              </div>

              <Field label="Website">
                <input
                  type="url"
                  value={editing.website ?? ""}
                  onChange={(e) => setEditing({ ...editing, website: e.target.value })}
                  className="w-full rounded-lg border border-accent/40 px-3 py-2"
                  placeholder="https://"
                />
              </Field>

              <Field label="Logo URL">
                <input
                  type="url"
                  value={editing.logo_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, logo_url: e.target.value })}
                  className="w-full rounded-lg border border-accent/40 px-3 py-2"
                  placeholder="https://"
                />
              </Field>

              <Field label="Cover photo URL">
                <input
                  type="url"
                  value={editing.cover_photo_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, cover_photo_url: e.target.value })}
                  className="w-full rounded-lg border border-accent/40 px-3 py-2"
                  placeholder="https://"
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-accent/40 bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-50"
              >
                {saving ? "Saving…" : editing.id ? "Save changes" : "Create venue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-primary">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}
