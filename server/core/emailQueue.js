import { emailQueue } from "./queue.js";
import { sendPasswordResetEmail, sendEmail } from "../utils/emailService.js";
import logger from "../utils/logger.js";

emailQueue.process("password-reset", async (job) => {
  const { email, resetToken, userName } = job.data;
  logger.info("Processing password reset email", { email });
  await sendPasswordResetEmail(email, resetToken, userName);
});

emailQueue.process("welcome-email", async (job) => {
  const { email, userName, tempPassword } = job.data;
  logger.info("Processing welcome email", { email });
  const { sendWelcomeEmail } = await import("../utils/emailService.js");
  await sendWelcomeEmail(email, userName, tempPassword);
});

emailQueue.process("leave-notification", async (job) => {
  const { userEmail, userName, status, leaveType, days } = job.data;
  logger.info("Processing leave notification email", { userEmail, status });
  const { sendLeaveNotification } = await import("../utils/emailService.js");
  await sendLeaveNotification(userEmail, userName, status, leaveType, days);
});

emailQueue.process("generic-email", async (job) => {
  const { to, subject, html, text } = job.data;
  logger.info("Processing generic email", { to, subject });
  await sendEmail({ to, subject, html, text });
});

logger.info("Email queue processors registered");
