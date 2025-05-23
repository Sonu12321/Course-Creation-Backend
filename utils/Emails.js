import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendverificationEmail = async(email, verificationToken) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Coursecreation <noreply@coursecreation.com>',
            to: email,
            subject: "Verify your email",
            html: `
                <h1>Email Verification</h1>
                <p>Your verification code is: <strong>${verificationToken}</strong></p>
                <p>This code will expire in 24 hours.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info);
        return info;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return null; // Return null instead of throwing error
    }
};

export const sendWelcomeEmail = async(email, firstname) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Coursecreation <noreply@coursecreation.com>',
            to: email,
            subject: "Welcome to Course Creation",
            html: `
                <h1>Welcome ${firstname}!</h1>
                <p>Thank you for verifying your email and joining our platform.</p>
                <p>We're excited to have you as part of our community!</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully:', info);
        return info;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return null;
    }
};
// SentResetP
export const SentResetP = async(email, resetToken) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Coursecreation <noreply@coursecreation.com>',
            to: email,
            subject: "Reset Your Password",
            html: `
                <h1>Password Reset Request</h1>
                <p>Your password reset token is: <strong>${resetToken}</strong></p>
                <p>To reset your password, use this token along with your new password.</p>
                <p>This token will expire in 30 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully:', info);
        return info;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return null;
    }
};

export const sendResetSuccessEmail = async(email) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Coursecreation <noreply@coursecreation.com>',
            to: email,
            subject: "Password Reset Successful",
            html: `
                <h1>Password Reset Successful</h1>
                <p>Your password has been successfully reset.</p>
                <p>If you didn't make this change, please contact support immediately.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset success email sent successfully:', info);
        return info;
    } catch (error) {
        console.error('Error sending reset success email:', error);
        return null;
    }
};