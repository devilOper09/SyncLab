import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import passport from "passport"
import googleAuth from "./routes/googleAuth.js"
import session from "express-session"


dotenv.config()
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}))
app.use(express.json())



app.use(session({
 secret: "synclab-secret",
 resave: false,
 saveUninitialized: true
}))

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", googleAuth);




app.set("trust proxy", 1); 

app.get("/", (req, res)=>{
 res.send("Server is running")
})



app.listen(PORT, ()=>{
 console.log(`Server running on port ${PORT}`)
})