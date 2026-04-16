export type BlogPostStatus = "draft" | "published" | "scheduled";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  hero_image_url: string | null;
  status: BlogPostStatus;
  published_at: string | null;
  scheduled_at: string | null;
  author_id: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = "worker" | "business_owner" | "admin";
export type ApplicationStatus = "new" | "viewed" | "interview_pending" | "interview" | "offered" | "accepted" | "rejected" | "withdrawn";
export type VisaStatus = "citizen" | "permanent_resident" | "working_holiday" | "work_visa" | "student_visa" | "no_visa" | "other";
export type SeasonPreference = "northern_winter" | "southern_winter" | "both" | "year_round";
export type HousingPreference = "staff_housing" | "private_rental" | "shared_rental" | "van_vehicle" | "no_preference";
export type PositionType = "full_time" | "part_time" | "casual";
export type VerificationStatus = "unverified" | "email_verified" | "id_verified" | "fully_verified";

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole | null;
  created_at: string;
}

export interface LanguageProficiency {
  language: string;
  proficiency: "native" | "fluent" | "conversational" | "basic";
}

export interface WorkerProfile {
  id: string;
  user_id: string;

  // Core Account Info
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  phone: string | null;
  profile_photo_url: string | null;
  location_current: string | null;
  country_of_residence: string | null;

  // Work Eligibility & Legal
  nationality: string | null;
  second_nationality: string | null;
  visa_status: VisaStatus | null;
  visa_expiry_date: string | null;
  work_eligible_countries: string[] | null;
  languages: LanguageProficiency[] | null;
  drivers_license: boolean | null;
  drivers_license_country: string | null;
  has_car: boolean | null;

  // Availability
  availability_start: string | null;
  availability_end: string | null;
  season_preference: SeasonPreference | null;
  preferred_resort_ids: string[] | null;
  preferred_countries: string[] | null;
  housing_preference: HousingPreference | null;
  willing_to_relocate: boolean | null;
  available_immediately: boolean | null;

  // Work Experience
  work_history: WorkHistoryEntry[] | null;
  certifications: Certification[] | null;
  references: Reference[] | null;
  skills: string[] | null;
  years_seasonal_experience: number | null;
  cv_url: string | null;
  cover_letter_url: string | null;

  // Preferences
  preferred_job_types: string[] | null;
  pay_range_min: number | null;
  pay_range_max: number | null;
  pay_currency: string | null;
  available_nights: boolean | null;
  available_weekends: boolean | null;
  preferred_days: string[] | null;
  position_type: PositionType | null;
  open_to_second_job: boolean | null;

  // Community & Bio
  bio: string | null;
  housing_needs_description: string | null;
  traveling_with_partner: boolean | null;
  traveling_with_pets: boolean | null;

  // System Metadata
  last_active_at: string | null;
  profile_completion_pct: number;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string | null;
}

export interface WorkHistoryEntry {
  id: string;
  title: string;
  company: string;
  resort_id: string | null;
  location: string;
  country: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string;
  category: "hospitality" | "retail" | "outdoor" | "food_beverage" | "admin" | "maintenance" | "instruction" | "cleaning_housekeeping" | "other";
  is_verified: boolean;
  verified_by_business_id: string | null;
}

export interface Certification {
  name: string;
  issuing_body: string | null;
  date_obtained: string | null;
  expiry_date: string | null;
  credential_url: string | null;
}

export type ReferenceType = "professional" | "personal";

export interface Reference {
  id: string;
  name: string;
  relationship: string;
  type: ReferenceType;
  company: string | null;
  job_title: string | null;
  location: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
}

export interface EmployerReview {
  id: string;
  worker_id: string;
  business_id: string;
  business_name: string;
  rating: number;
  review_text: string | null;
  season: string | null;
  resort_id: string | null;
  skills_endorsed: string[] | null;
  created_at: string;
}

export interface BusinessReview {
  id: string;
  worker_id: string;
  business_id: string;
  rating: number;
  title: string | null;
  review_text: string | null;
  season: string | null;
  position: string | null;
  would_recommend: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkillEndorsement {
  id: string;
  worker_id: string;
  skill: string;
  endorsed_by_user_id: string;
  endorsed_by_name: string;
  created_at: string;
}

export type BusinessVerificationStatus = "unverified" | "pending_review" | "accepted" | "pending_verification" | "verified" | "rejected";

export type BusinessCategory =
  | "ski_school"
  | "hospitality"
  | "food_beverage"
  | "retail"
  | "resort_operations"
  | "accommodation"
  | "rental_shop"
  | "transport"
  | "entertainment"
  | "other";

export interface BusinessSocialLinks {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  tiktok?: string;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  description: string | null;
  website: string | null;
  location: string | null;
  is_verified: boolean;
  verification_status: BusinessVerificationStatus;
  slug: string | null;
  category: BusinessCategory | null;
  year_established: number | null;
  logo_url: string | null;
  social_links: BusinessSocialLinks | null;
  standard_perks: string[] | null;
  phone: string | null;
  email: string | null;
  timezone: string | null;
  tier: "free" | "premium";
  created_at: string;
}

export type BusinessTier = "free" | "standard" | "premium" | "enterprise";

export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_type: "worker" | "business" | null;
  status: "pending" | "completed";
  created_at: string;
}

export interface BusinessResort {
  id: string;
  business_id: string;
  resort_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface BusinessPhoto {
  id: string;
  business_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface BusinessFollower {
  id: string;
  business_id: string;
  worker_id: string;
  created_at: string;
}

export interface Region {
  id: string;
  name: string;
  country: string;
  description: string | null;
}

export type SnowReliability = "high" | "medium" | "low";

export interface LiftTypes {
  gondolas: number;
  chairlifts: number;
  surface_lifts: number;
}

export interface NearbyTown {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  distance_km: number;
}

export interface Resort {
  id: string;
  name: string;
  region_id: string;
  country: string;
  description: string | null;
  latitude: number;
  longitude: number;
  created_at: string;

  // Core Info
  state_province: string | null;
  nearest_town: string | null;
  website: string | null;
  logo_url: string | null;
  banner_image_url: string | null;

  // Resort Profile
  skiable_terrain_ha: number | null;
  num_runs: number | null;
  runs_green: number | null;
  runs_blue: number | null;
  runs_black: number | null;
  runs_double_black: number | null;
  vertical_drop_m: number | null;
  base_elevation_m: number | null;
  summit_elevation_m: number | null;
  num_lifts: number | null;
  lift_types: LiftTypes | null;
  snowfall_avg_cm: number | null;
  season_start: string | null;
  season_end: string | null;

  // Employment Context
  main_employers: string[] | null;
  common_jobs: string[] | null;
  estimated_seasonal_staff: string | null;
  languages_required: string[] | null;
  visa_requirements: string | null;
  recruitment_timeline: string | null;

  // Worker Amenities & Living
  staff_housing_available: boolean | null;
  staff_housing_capacity: number | null;
  staff_housing_avg_rent: string | null;
  cost_of_living_weekly: string | null;
  public_transport: string | null;
  staff_perks: string[] | null;

  // Local Life & Community
  apres_scene: string | null;
  outdoor_activities: string[] | null;
  healthcare_access: string | null;
  shops_and_services: string | null;
  international_community_size: string | null;

  // Climate & Weather
  avg_winter_temp_min_c: number | null;
  avg_winter_temp_max_c: number | null;
  snow_reliability: SnowReliability | null;
  artificial_snow_coverage_pct: number | null;

  // System Metadata
  updated_at: string | null;
  is_verified: boolean;

  // Nearby Towns (populated via API join)
  nearby_towns?: NearbyTown[];
}

export interface JobPost {
  id: string;
  business_id: string;
  resort_id: string;
  title: string;
  description: string;
  requirements: string | null;
  accommodation_included: boolean;
  salary_range: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  // Extended fields (migration 00006)
  category: string | null;
  position_type: "full_time" | "part_time" | "casual";
  pay_amount: string | null;
  pay_currency: string | null;
  housing_details: string | null;
  meal_perks: boolean;
  ski_pass_included: boolean;
  language_required: string | null;
  visa_sponsorship: boolean;
  urgently_hiring: boolean;
  positions_available: number;
  accommodation_type: string | null;
  accommodation_cost: string | null;
  status: "active" | "paused" | "closed" | "draft";
  featured_until: string | null;
}

export interface Application {
  id: string;
  job_post_id: string;
  worker_id: string;
  status: ApplicationStatus;
  applied_at: string;
  cover_letter: string | null;
  resume_url: string | null;
  updated_at: string | null;
}

// ── Interview Scheduling ──────────────────────────────

export type InterviewStatus = "invited" | "scheduled" | "completed" | "cancelled" | "rescheduled" | "live" | "declined";

export type NotificationType =
  | "interview_invited"
  | "interview_scheduled"
  | "interview_cancelled"
  | "interview_rescheduled"
  | "interview_reminder"
  | "application_status_changed"
  | "job_alert_match"
  | "business_new_job"
  | "business_closed_job"
  | "business_update"
  | "new_message"
  | "reschedule_approved"
  | "reschedule_declined"
  | "general"
  | "instant_interview_request"
  | "instant_interview_declined"
  | "instant_interview_rescheduled";

export interface InterviewAvailability {
  id: string;
  business_id: string;
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  slot_duration_minutes: 15 | 30 | 45 | 60;
  buffer_minutes: 0 | 5 | 10 | 15 | 30;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface InterviewAvailabilityBlock {
  id: string;
  availability_id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
}

export interface Interview {
  id: string;
  application_id: string;
  business_id: string;
  worker_id: string;
  status: InterviewStatus;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  timezone: string | null;
  slot_duration_minutes: number | null;
  video_room_name: string | null;
  video_room_url: string | null;
  invite_token: string;
  business_notes: string | null;
  invited_at: string;
  scheduled_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string | null;
  is_instant: boolean;
  room_expires_at: string | null;
  declined_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Support Reports
export type SupportReportCategory =
  | "bug"
  | "feature_request"
  | "content_issue"
  | "account_issue"
  | "other";

export type SupportReportStatus = "open" | "resolved" | "dismissed";

export interface SupportReport {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  category: SupportReportCategory;
  subject: string;
  message: string;
  page_url: string | null;
  user_agent: string | null;
  status: SupportReportStatus;
  admin_note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}
