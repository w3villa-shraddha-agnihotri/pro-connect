import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email, token) {
  const verificationUrl =
    `${process.env.BACKEND_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Verify your ProConnect email",
    html: `
      <h2>Welcome to ProConnect!</h2>
      <p>Please verify your email address to activate your account.</p>
      <a href="${verificationUrl}"
         style="display:inline-block;padding:12px 20px;background:#4370ea;color:white;text-decoration:none;border-radius:6px;">
        Verify Email
      </a>
      <p>This link expires in 15 minutes.</p>
    `,
  });
}
