import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import connectDB from "../config/db.js";

dotenv.config();

const updateAdmin = async () => {
    try {
        await connectDB();
        console.log("✅ Connected to DB");

        // 1. Promote/Create admin@nsrit.edu.in
        const targetEmail = "admin@nsrit.edu.in";
        let admin = await User.findOne({ email: targetEmail });

        if (admin) {
            console.log(`Found ${targetEmail}. Updating role to ADMIN...`);
            admin.role = "ADMIN";
            admin.status = "ACTIVE";
            await admin.save();
            console.log("✅ Admin updated.");
        } else {
            console.log(`${targetEmail} not found. Creating...`);
            const defaultPass = "Admin@123";
            const hashed = await bcrypt.hash(defaultPass, 10);
            await User.create({
                email: targetEmail,
                password: hashed,
                plainPassword: defaultPass,
                role: "ADMIN",
                status: "ACTIVE"
            });
            console.log(`✅ Created ${targetEmail} with password: ${defaultPass}`);
        }

        // 2. Remove 'capstone' email
        const deleted = await User.deleteMany({ email: { $regex: 'capstone', $options: 'i' } });
        if (deleted.deletedCount > 0) {
            console.log(`✅ Removed ${deleted.deletedCount} user(s) containing 'capstone'.`);
        } else {
            console.log("ℹ️ No 'capstone' users found.");
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
};

updateAdmin();
