import pool from "../db.js";
import validator from "validator"; 
import bcrypt from "bcrypt";
import { isFounderEmail, normalizeEmail } from "../utils/founder.js";
import { validateEmail, validateString } from "../utils/validation.js";

export const signup = async(req, res)=>{
    try {

        const {email, password} = req.body
        const normalizedEmail = validateEmail(email);
        const cleanPassword = validateString(password, "Password", {
            required: true,
            minLength: 6,
            maxLength: 100,
            escape: false
        });
        const existingUser = await pool.query(
            "SELECT 1 FROM SyncLabUsers WHERE email = $1",
            [normalizedEmail]
        );
        if(existingUser.rows.length>0){
            return res.status(409).json({
                success:false,
                message:"Email already exists"
            })
        }

        const hashedPassword = await bcrypt.hash(cleanPassword, 10)

        const inserted = await pool.query(
            "INSERT INTO SyncLabUsers(email, password, is_founder) VALUES ($1,$2,false) RETURNING id, profile_complete, is_founder",
            [normalizedEmail, hashedPassword]
        )
        const newUser = inserted.rows[0]
        res.json({ message: "User Created", success: true, user_id: newUser.id, profile_complete: newUser.profile_complete, is_founder: newUser.is_founder })

        
    } catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message || "SignUp failed" })
        
    }
}

export const login = async(req, res)=>{

    try{
    const {email, password} = req.body
    const normalizedEmail = validateEmail(email)
    const cleanPassword = validateString(password, "Password", {
        required: true,
        escape: false
    });

    const result = await pool.query(
        "SELECT * FROM SyncLabUsers WHERE email=$1",
        [normalizedEmail]
    )
    const user = result.rows[0]

    if(!user || !user.password){
        return res.status(400).json({message:"Invalid email or password", success:false})
    }

    const passwordMatch = await bcrypt.compare(cleanPassword, user.password)
    if(!passwordMatch){
        return res.status(400).json({message:"Invalid email or password", success:false})
    }

    const founderStatus = isFounderEmail(normalizedEmail)
    const updated = await pool.query(
        `UPDATE SyncLabUsers
         SET is_founder = $1
         WHERE id = $2
         RETURNING id, profile_complete, is_founder`,
        [founderStatus, user.id]
    )

    const updatedUser = updated.rows[0]
    res.json({ message: "Login Successful", success: true, user_id: updatedUser.id, profile_complete: updatedUser.profile_complete, is_founder: updatedUser.is_founder, display_name: user.display_name, avatar_url: user.profile_picture || user.avatar_url || user.avatar })

}catch(error){
    console.log(error)
    res.status(400).json({ success: false, message: error.message || "Login Failed" })

}
}
