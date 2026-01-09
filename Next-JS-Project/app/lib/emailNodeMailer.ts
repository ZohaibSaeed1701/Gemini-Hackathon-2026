import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "zohaib45215330@gmail.com",
        pass: "mmab ogua bgqi jhjn" // app password
    }
});

export async function sendEmail(receiver: string, text: string) {
    await transporter.sendMail({
        from: "zohaib45215330@gmail.com",
        to: receiver,
        subject: "Test Email",
        text: text,
    });
}
