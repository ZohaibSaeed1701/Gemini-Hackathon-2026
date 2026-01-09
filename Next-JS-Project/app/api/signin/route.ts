import dbConnect from "@/app/lib/databaseConnection";
import User from "@/app/models/user.model";
import bcript from "bcryptjs";

export async function POST (request: Request){

    const { email, password, otp } = await request.json();

    try{

        await dbConnect();
        if( !email && !password ){
            return new Response(JSON.stringify(
            {
                success: false,
                message: "This Email and Password must required",
            }), {
                status: 400,
            headers: { "Content-Type": "application/json" },
            });
        }

        const email_already_exist = await User.findOne({email});
        if(!email_already_exist){
            return new Response(JSON.stringify(
            {
                success: false,
                message: "This email is not found in DataBase",
            }), {
                status: 400,
            headers: { "Content-Type": "application/json" },
            });
        }

        const databasePassword = email_already_exist.password;
        const isPasswordCorrect = await bcript.compare(password, databasePassword);
        const databaseOtp = email_already_exist.otp;

        if(databaseOtp != otp){
            return new Response(JSON.stringify({
                success: false,
                message: "Your OTP is not correct",
            }),{
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        if(!isPasswordCorrect){
            return new Response(JSON.stringify(
            {
                success: false,
                message: "Your Passwrod is wronge",
            }), {
                status: 400,
            headers: { "Content-Type": "application/json" },
            });
        }

        if(email_already_exist.expiry_time && email_already_exist.expiry_time?.getTime() > Date.now()){
            return new Response(JSON.stringify(
            {
                success: false,
                message: "Login Time is out",
            }), {
                status: 400,
            headers: { "Content-Type": "application/json" },
            });
        }


        email_already_exist.is_verified = true;
        email_already_exist.otp = null;
        email_already_exist.expiry_time = null;

        await email_already_exist.save();
        return new Response(JSON.stringify(
            {
                success: true,
                message: "Login Successfully",
            }), {
                status: 200,
            headers: { "Content-Type": "application/json" },
        });

    }catch(error){
        console.error("DB Connection Failed");
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