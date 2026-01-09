import dbConnect from "@/app/lib/databaseConnection";
import User from "@/app/models/user.model";
import bcrypt from "bcryptjs";

import { sendEmail } from "@/app/lib/emailNodeMailer";

function generate_otp(){

    const otp = Math.floor(100000 + Math.random() * 900000);

    return otp;
}

export async function POST (request: Request){
    
    const { first_name, last_name, email, password, phone_no, role } = await request.json();
    
    try{

        await dbConnect();
        if(!email && !password){
            return new Response(JSON.stringify(
            {
                success: false,
                message: "email and password is required",
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const email_already_exist = await User.findOne({email});
        if(email_already_exist){
            return new Response(JSON.stringify(
            {
                success: false,
                message: "This Email is already register",
            }), {
                status: 400,
            headers: { "Content-Type": "application/json" },
            });
        }

        const hashpassword = await bcrypt.hash(password, 10);


        const expiry_times = new Date(Date.now() + 60 * 60 * 1000);

        const new_otp = generate_otp();
        
        await sendEmail(email, `Your OTP is: ${new_otp}`);

        const newUser = new User({
            first_name,
	        last_name,
	        email,
    	    password: hashpassword,
        	phone_no,
            role: role,
            is_verified: false,
	        otp: new_otp,
	        expiry_time: expiry_times,
        });

        await newUser.save();

        return new Response(JSON.stringify(
            {
                success: true,
                message: "User register successfully",
            }), {
                status: 200,
            headers: { "Content-Type": "application/json" },
        });

    }catch(error){
        console.log("DB Connection Failed");
        return new Response(JSON.stringify(
            {
                success: false,
                message: "DB Connection Failed",
            }), {
                status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

}