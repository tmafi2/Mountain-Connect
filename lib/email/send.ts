import { sendEmail } from "./client";
import { interviewInviteEmail } from "./templates/interview-invite";
import { interviewConfirmationEmail } from "./templates/interview-confirmation";
import { interviewCancelledEmail } from "./templates/interview-cancelled";
import { businessNewJobEmail } from "./templates/business-new-job";
import { waitlistWorkerEmail } from "./templates/waitlist-worker";
import { waitlistBusinessEmail } from "./templates/waitlist-business";
import { applicationReceivedEmail } from "./templates/application-received";
import { applicationStatusChangedEmail } from "./templates/application-status-changed";
import { newApplicantEmail } from "./templates/new-applicant";
import { businessVerifiedEmail } from "./templates/business-verified";
import { businessUnverifiedEmail } from "./templates/business-unverified";
import { claimLinkEmail } from "./templates/claim-link";
import { listingClaimedEmail } from "./templates/listing-claimed";
import { welcomeWorkerEmail } from "./templates/welcome-worker";
import { welcomeBusinessEmail } from "./templates/welcome-business";
import { newMessageEmail } from "./templates/new-message";
import { jobAlertMatchEmail } from "./templates/job-alert-match";
import { supportReportReceivedEmail } from "./templates/support-report-received";
import { supportReportAdminAlertEmail } from "./templates/support-report-admin-alert";
import { loginOtpEmail } from "./templates/login-otp";
import { onboardingReminderEmail } from "./templates/onboarding-reminder";
import { applicationWithdrawnEmail } from "./templates/application-withdrawn";
import { instantInterviewRequestEmail } from "./templates/instant-interview-request";
import { instantInterviewDeclinedEmail } from "./templates/instant-interview-declined";
import { instantInterviewRescheduledEmail } from "./templates/instant-interview-rescheduled";
import { contractSentEmail } from "./templates/contract-sent";
import { contractSignedEmail } from "./templates/contract-signed";
import { importOutreachEmail } from "./templates/import-outreach";
import { adminListingClaimedEmail } from "./templates/admin-listing-claimed";
import { eoiThresholdNudgeEmail } from "./templates/eoi-threshold-nudge";
import { firstApplicantNudgeEmail } from "./templates/first-applicant-nudge";
import { claimLastChanceEmail } from "./templates/claim-last-chance";
import { winterOutreachEmail } from "./templates/winter-outreach";
import { salesDropinEmail } from "./templates/sales-dropin";

const FROM_EMAIL = "Mountain Connects <notifications@mountainconnects.com>";
const TYLER_FROM_EMAIL = "Tyler @ Mountain Connects <tyler@mountainconnects.com>";
const TYLER_REPLY_TO = "tyler@mountainconnects.com";

export async function sendInterviewInviteEmail(params: {
  to: string;
  workerName: string;
  businessName: string;
  jobTitle: string;
  bookingUrl: string;
}) {
  const { subject, html } = interviewInviteEmail(params);
  return sendEmail({
    from: FROM_EMAIL,
    to: params.to,
    subject,
    html,
  });
}

export async function sendInterviewConfirmationEmail(params: {
  to: string;
  recipientName: string;
  otherPartyName: string;
  jobTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  interviewUrl: string;
}) {
  const { subject, html } = interviewConfirmationEmail(params);
  return sendEmail({
    from: FROM_EMAIL,
    to: params.to,
    subject,
    html,
  });
}

export async function sendInterviewCancelledEmail(params: {
  to: string;
  recipientName: string;
  otherPartyName: string;
  jobTitle: string;
  date?: string;
  startTime?: string;
  dashboardUrl: string;
}) {
  const { subject, html } = interviewCancelledEmail(params);
  return sendEmail({
    from: FROM_EMAIL,
    to: params.to,
    subject,
    html,
  });
}

export async function sendBusinessNewJobEmail(params: {
  to: string;
  workerName: string;
  businessName: string;
  jobTitle: string;
  jobUrl: string;
  location: string;
  pay: string;
}) {
  const { subject, html } = businessNewJobEmail(params);
  return sendEmail({
    from: FROM_EMAIL,
    to: params.to,
    subject,
    html,
  });
}

export async function sendWaitlistWorkerEmail(params: { to: string }) {
  const { subject, html } = waitlistWorkerEmail({ email: params.to });
  return sendEmail({
    from: FROM_EMAIL,
    to: params.to,
    subject,
    html,
  });
}

export async function sendWaitlistBusinessEmail(params: {
  to: string;
  businessName: string;
  resort: string;
}) {
  const { subject, html } = waitlistBusinessEmail({
    email: params.to,
    businessName: params.businessName,
    resort: params.resort,
  });
  return sendEmail({
    from: FROM_EMAIL,
    to: params.to,
    subject,
    html,
  });
}

// ── New notification emails ──────────────────────────────

export async function sendApplicationReceivedEmail(params: {
  to: string;
  workerName: string;
  jobTitle: string;
  businessName: string;
  jobUrl: string;
}) {
  const { subject, html } = applicationReceivedEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendApplicationStatusChangedEmail(params: {
  to: string;
  workerName: string;
  jobTitle: string;
  businessName: string;
  newStatus: string;
  dashboardUrl: string;
}) {
  const { subject, html } = applicationStatusChangedEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendNewApplicantEmail(params: {
  to: string;
  businessName: string;
  workerName: string;
  jobTitle: string;
  applicantsUrl: string;
}) {
  const { subject, html } = newApplicantEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendBusinessVerifiedEmail(params: {
  to: string;
  businessName: string;
  dashboardUrl: string;
}) {
  const { subject, html } = businessVerifiedEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendBusinessUnverifiedEmail(params: {
  to: string;
  businessName: string;
  reason?: string | null;
  dashboardUrl: string;
}) {
  const { subject, html } = businessUnverifiedEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendClaimLinkEmail(params: {
  to: string;
  businessName: string;
  jobTitle: string;
  claimUrl: string;
}) {
  const { subject, html } = claimLinkEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendListingClaimedEmail(params: {
  to: string;
  businessName: string;
  dashboardUrl: string;
}) {
  const { subject, html } = listingClaimedEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendWelcomeWorkerEmail(params: {
  to: string;
  workerName: string;
  profileUrl: string;
}) {
  const { subject, html } = welcomeWorkerEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendWelcomeBusinessEmail(params: {
  to: string;
  businessName: string;
  profileUrl: string;
}) {
  const { subject, html } = welcomeBusinessEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendNewMessageEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  messagePreview: string;
  conversationUrl: string;
}) {
  const { subject, html } = newMessageEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendJobAlertMatchEmail(params: {
  to: string;
  workerName: string;
  alertName: string;
  jobTitle: string;
  businessName: string;
  location: string;
  pay: string;
  jobUrl: string;
  alertsUrl: string;
}) {
  const { subject, html } = jobAlertMatchEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendSupportReportConfirmationEmail(params: {
  to: string;
  userName: string;
  category: string;
  subject: string;
  reportId: string;
}) {
  const { subject: emailSubject, html } = supportReportReceivedEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject: emailSubject, html });
}

export async function sendSupportReportAdminAlertEmail(params: {
  to: string;
  category: string;
  subject: string;
  userName: string;
  userEmail: string;
  message: string;
  pageUrl: string | null;
  reportUrl: string;
}) {
  const { subject: emailSubject, html } = supportReportAdminAlertEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject: emailSubject, html });
}

export async function sendLoginOtpEmail(params: {
  to: string;
  userName: string;
  code: string;
}) {
  const { subject, html } = loginOtpEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendOnboardingReminderEmail(params: {
  to: string;
  userName: string;
  accountType: "worker" | "business";
  loginUrl: string;
}) {
  const { subject, html } = onboardingReminderEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendApplicationWithdrawnEmail(params: {
  to: string;
  businessName: string;
  workerName: string;
  jobTitle: string;
  applicantsUrl: string;
}) {
  const { subject, html } = applicationWithdrawnEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendInstantInterviewRequestEmail(params: {
  to: string;
  workerName: string;
  businessName: string;
  jobTitle: string;
  interviewUrl: string;
}) {
  const { subject, html } = instantInterviewRequestEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendInstantInterviewDeclinedEmail(params: {
  to: string;
  businessName: string;
  workerName: string;
  jobTitle: string;
  applicantsUrl: string;
}) {
  const { subject, html } = instantInterviewDeclinedEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendInstantInterviewRescheduledEmail(params: {
  to: string;
  businessName: string;
  workerName: string;
  jobTitle: string;
  interviewsUrl: string;
}) {
  const { subject, html } = instantInterviewRescheduledEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendContractSentEmail(params: {
  to: string;
  workerName: string;
  businessName: string;
  jobTitle: string;
  contractUrl: string;
}) {
  const { subject, html } = contractSentEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendContractSignedEmail(params: {
  to: string;
  businessName: string;
  workerName: string;
  jobTitle: string;
  applicantsUrl: string;
}) {
  const { subject, html } = contractSignedEmail(params);
  return sendEmail({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendAdminListingClaimedEmail(params: {
  to: string;
  businessName: string;
  businessEmail: string;
  jobCount: number;
  adminBusinessUrl: string;
}) {
  const { subject, html } = adminListingClaimedEmail(params);
  return sendEmail({
    from: FROM_EMAIL,
    to: params.to,
    subject,
    html,
  });
}

export async function sendImportOutreachEmail(params: {
  to: string;
  businessName: string;
  jobTitle: string;
  source: string;
  claimUrl: string;
  eoiCount: number;
}) {
  const { subject, html } = importOutreachEmail(params);
  return sendEmail({
    from: TYLER_FROM_EMAIL,
    to: params.to,
    replyTo: TYLER_REPLY_TO,
    subject,
    html,
  });
}

export async function sendEoiThresholdNudgeEmail(params: {
  to: string;
  businessName: string;
  jobTitle: string;
  eoiCount: number;
  claimUrl: string;
}) {
  const { subject, html } = eoiThresholdNudgeEmail(params);
  return sendEmail({
    from: TYLER_FROM_EMAIL,
    to: params.to,
    replyTo: TYLER_REPLY_TO,
    subject,
    html,
  });
}

export async function sendFirstApplicantNudgeEmail(params: {
  to: string;
  businessName: string;
  jobTitle: string;
  claimUrl: string;
}) {
  const { subject, html } = firstApplicantNudgeEmail(params);
  return sendEmail({
    from: TYLER_FROM_EMAIL,
    to: params.to,
    replyTo: TYLER_REPLY_TO,
    subject,
    html,
  });
}

export async function sendClaimLastChanceEmail(params: {
  to: string;
  businessName: string;
  jobTitle: string;
  eoiCount: number;
  takedownDate: string;
  claimUrl: string;
}) {
  const { subject, html } = claimLastChanceEmail(params);
  return sendEmail({
    from: TYLER_FROM_EMAIL,
    to: params.to,
    replyTo: TYLER_REPLY_TO,
    subject,
    html,
  });
}

export async function sendWinterOutreachEmail(params: {
  to: string;
  businessName: string;
  ctaUrl: string;
  unsubscribeUrl: string;
  locationName?: string;
}) {
  const { subject, html } = winterOutreachEmail(params);
  return sendEmail({
    from: TYLER_FROM_EMAIL,
    to: params.to,
    replyTo: TYLER_REPLY_TO,
    subject,
    html,
  });
}

export async function sendSalesDropinEmail(params: {
  to: string;
  businessName: string;
  contactPersonName?: string;
  locationName?: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}) {
  const { subject, html } = salesDropinEmail(params);
  return sendEmail({
    from: TYLER_FROM_EMAIL,
    to: params.to,
    replyTo: TYLER_REPLY_TO,
    subject,
    html,
  });
}
