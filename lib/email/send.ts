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

const FROM_EMAIL = "Mountain Connects <notifications@mountainconnects.com>";

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
