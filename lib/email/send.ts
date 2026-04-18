import { getResendClient } from "./client";
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
  const resend = getResendClient();
  if (!resend) return null;

  const { subject, html } = interviewInviteEmail(params);
  return resend.emails.send({
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
  const resend = getResendClient();
  if (!resend) return null;

  const { subject, html } = interviewConfirmationEmail(params);
  return resend.emails.send({
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
  const resend = getResendClient();
  if (!resend) return null;

  const { subject, html } = interviewCancelledEmail(params);
  return resend.emails.send({
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
  const resend = getResendClient();
  if (!resend) return null;

  const { subject, html } = businessNewJobEmail(params);
  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject,
    html,
  });
}

export async function sendWaitlistWorkerEmail(params: { to: string }) {
  const resend = getResendClient();
  if (!resend) return null;

  const { subject, html } = waitlistWorkerEmail({ email: params.to });
  return resend.emails.send({
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
  const resend = getResendClient();
  if (!resend) return null;

  const { subject, html } = waitlistBusinessEmail({
    email: params.to,
    businessName: params.businessName,
    resort: params.resort,
  });
  return resend.emails.send({
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
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = applicationReceivedEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendApplicationStatusChangedEmail(params: {
  to: string;
  workerName: string;
  jobTitle: string;
  businessName: string;
  newStatus: string;
  dashboardUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = applicationStatusChangedEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendNewApplicantEmail(params: {
  to: string;
  businessName: string;
  workerName: string;
  jobTitle: string;
  applicantsUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = newApplicantEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendBusinessVerifiedEmail(params: {
  to: string;
  businessName: string;
  dashboardUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = businessVerifiedEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendBusinessUnverifiedEmail(params: {
  to: string;
  businessName: string;
  reason?: string | null;
  dashboardUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = businessUnverifiedEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendClaimLinkEmail(params: {
  to: string;
  businessName: string;
  jobTitle: string;
  claimUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = claimLinkEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendListingClaimedEmail(params: {
  to: string;
  businessName: string;
  dashboardUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = listingClaimedEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendWelcomeWorkerEmail(params: {
  to: string;
  workerName: string;
  profileUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = welcomeWorkerEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendWelcomeBusinessEmail(params: {
  to: string;
  businessName: string;
  profileUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = welcomeBusinessEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendNewMessageEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  messagePreview: string;
  conversationUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = newMessageEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
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
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = jobAlertMatchEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendSupportReportConfirmationEmail(params: {
  to: string;
  userName: string;
  category: string;
  subject: string;
  reportId: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject: emailSubject, html } = supportReportReceivedEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject: emailSubject, html });
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
  const resend = getResendClient();
  if (!resend) return null;
  const { subject: emailSubject, html } = supportReportAdminAlertEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject: emailSubject, html });
}

export async function sendLoginOtpEmail(params: {
  to: string;
  userName: string;
  code: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = loginOtpEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendOnboardingReminderEmail(params: {
  to: string;
  userName: string;
  accountType: "worker" | "business";
  loginUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = onboardingReminderEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendApplicationWithdrawnEmail(params: {
  to: string;
  businessName: string;
  workerName: string;
  jobTitle: string;
  applicantsUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = applicationWithdrawnEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendInstantInterviewRequestEmail(params: {
  to: string;
  workerName: string;
  businessName: string;
  jobTitle: string;
  interviewUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = instantInterviewRequestEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendInstantInterviewDeclinedEmail(params: {
  to: string;
  businessName: string;
  workerName: string;
  jobTitle: string;
  applicantsUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = instantInterviewDeclinedEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendInstantInterviewRescheduledEmail(params: {
  to: string;
  businessName: string;
  workerName: string;
  jobTitle: string;
  interviewsUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = instantInterviewRescheduledEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendContractSentEmail(params: {
  to: string;
  workerName: string;
  businessName: string;
  jobTitle: string;
  contractUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = contractSentEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendContractSignedEmail(params: {
  to: string;
  businessName: string;
  workerName: string;
  jobTitle: string;
  applicantsUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = contractSignedEmail(params);
  return resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html });
}

export async function sendImportOutreachEmail(params: {
  to: string;
  businessName: string;
  jobTitle: string;
  source: string;
  claimUrl: string;
  eoiCount: number;
}) {
  const resend = getResendClient();
  if (!resend) return null;
  const { subject, html } = importOutreachEmail(params);
  return resend.emails.send({
    from: TYLER_FROM_EMAIL,
    to: params.to,
    replyTo: TYLER_REPLY_TO,
    subject,
    html,
  });
}
