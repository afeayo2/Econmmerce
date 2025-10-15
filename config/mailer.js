const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.us.appsuite.cloud",
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Twinkleweetphyn" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent to ${to}, Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Nodemailer error:", error);
    throw error; // don’t wrap it — let the real error bubble up
  }
};

module.exports = { sendMail };


/*
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.us.appsuite.cloud",
  port: 2525,            // ✅ use 2525 instead of 465
  secure: false,         // must be false on 2525
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Twinkleweetphyn" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent to ${to}, Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Nodemailer error:", error);
    throw error;
  }
};

module.exports = { sendMail };
*/