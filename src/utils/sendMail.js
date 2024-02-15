import nodemailer from "nodemailer"

const sendMail =  async (mailParams)=>{

   const {recepientEmail, targetLink, subject, message} = mailParams

    const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST,
        port: process.env.MAILTRAP_PORT,
        auth: {
        user: process.env.MAILTRAP_USERNAME,
        pass: process.env.MAITRAP_PASSWORD
        }
    })

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: {recepientEmail},
        subject: {subject},
        text: `${message}:  ${targetLink}`,
      };
    
   

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error occurred:', error);
        return null;
    }

   
}




export {sendMail}