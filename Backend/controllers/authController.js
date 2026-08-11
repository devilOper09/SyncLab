import pool from "../db.js";
import validator from "validator"; 
import bcrypt from "bcrypt";
import { isFounderEmail, normalizeEmail } from "../utils/founder.js";

export const signup = async(req, res)=>{
    try {

        const {email, password} = req.body
        const normalizedEmail = normalizeEmail(email);
        if(!validator.isEmail(normalizedEmail)){
            return res.status(400).json({
                success:false,
                message: "please enter a valid email address"
            })
        }
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

        const hashedPassword = await bcrypt.hash(password, 10)

        const inserted = await pool.query(
            "INSERT INTO SyncLabUsers(email, password, is_founder) VALUES ($1,$2,false) RETURNING id, profile_complete, is_founder",
            [normalizedEmail, hashedPassword]
        )
        const newUser = inserted.rows[0]
        res.json({ message: "User Created", success: true, user_id: newUser.id, profile_complete: newUser.profile_complete, is_founder: newUser.is_founder })

        
    } catch (error) {
        console.log(error)
        res.status(500).json({error:"SignUp failed"})
        
    }
}

export const login = async(req, res)=>{

    try{
    const {email, password} = req.body
    const normalizedEmail = normalizeEmail(email)

    const result = await pool.query(
        "SELECT * FROM SyncLabUsers WHERE email=$1",
        [normalizedEmail]
    )
    const user = result.rows[0]

    if(!user){
        return res.status(400).json({message:"Invalid email or password", success:false})
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
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
    res.status(500).json({error:"Login Failed"})

}
}
