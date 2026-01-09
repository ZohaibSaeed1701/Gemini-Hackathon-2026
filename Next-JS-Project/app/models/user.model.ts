import mongoose, { Document, Schema, Model } from "mongoose";

export interface UserTS extends Document {
	first_name: string;
	last_name: string;
	email: string;
	password: string;
	phone_no: string;
	role: string;
	is_verified: boolean;
	otp: string | null;
	expiry_time: Date | null;
}

const userSchema: Schema<UserTS> = new Schema(
	{
		first_name: {
			type: String,
			required: true,
			trim: true,
		},
		last_name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
		},
		phone_no: {
			type: String,
			required: true,
			minlength: 11,
			maxlength: 11,
		},
		role: {
			type: String,
			enum: ["student", "teacher"],
			default: "teacher",
		},
		is_verified: {
    		type: Boolean,
    		default: false,
		},
		otp: {
			type: String,
			maxlength: 6,
			minlength: 6,
			default: null,
		},
		expiry_time: {
	    	type: Date,
			default: null
    	},

	},
	{
		timestamps: true, 
	}
);

const User: Model<UserTS> =
	mongoose.models.User || mongoose.model<UserTS>("User", userSchema);

export default User;