import { getResendClient } from "./client";
import { interviewInviteEmail } from "./templates/interview-invite";
import { interviewConfirmationEmail } from "./templates/interview-confirmation";
import { interviewCancelledEmail } from "./templates/interview-cancelled";
import { businessNewJobEmail } from "./templates/business-new-job";
import { waitlistWorkerEmail } from "./templates/waitlist-worker";
import { waitlistBusinessEmail } from "./templates/waitlist-business";

const FROM_EMAIL = "Mountain Connect <hello@mountainconnects.com>";

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
  workerName: string;
  businessName: string;
  jobTitle: string;
  date?: string;
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
