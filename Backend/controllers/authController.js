import pool from "../db.js";

export const signup = async(req, res)=>{
    try {

        const {email, password} = req.body

        await pool.query(
            "INSERT INTO SyncLabUsers(email, password) VALUES ($1,$2)",
            [email, password]
        )
        res.json({message:"User Created", success:true})

        
    } catch (error) {
        console.log(error)
        res.status(500).json({error:"SignUp failed"})
        
    }
}

export const login = async(req, res)=>{

    try{
    const {email, password} = req.body

    const result = await pool.query(
        "SELECT * FROM SyncLabUsers WHERE email=$1",
        [email]
    )
    const user = result.rows[0]

    if(user.password!==password){
        return res.status(400).json({message:"Wrong Password", success:false})
    }
    res.json({message:"Login Successful"})

}catch(error){
    res.status(500).json({error:"Login Failed"})

}
}
