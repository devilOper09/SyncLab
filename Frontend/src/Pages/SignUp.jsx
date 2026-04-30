import React, { use } from 'react'
import { Link } from 'react-router-dom'
import api from '../Api/Api.js'
import { useState } from 'react'
import Navbar from '../components/Navbar.jsx'

function SignUp() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword,setConfirmPassword] = useState("")

  const handleSignUp = async (e) =>{
    e.preventDefault()

    try {
      const res = await api.post("auth/signup",{
        email,
        password
      })
      console.log(res.data)
    } catch (error) {
      console.log("err.response.data")
      
    }
  }

  return (
    <>
    <Navbar />
    <div className="bg-slate-950 text-slate-200 min-h-screen flex items-center justify-center px-4">
      
      <div className="w-full sm:w-[420px] p-5 sm:p-8 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl shadow-lg">

        <input
          type="text"
          placeholder="Email Address"
          className="focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-600 rounded-xl p-2 mt-6 w-full opacity-75 bg-transparent"
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Create Password"
          className="focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-600 rounded-xl p-2 mt-5 w-full opacity-75 bg-transparent"
          onChange={(e)=>setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          className="focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-600 rounded-xl p-2 mt-5 w-full opacity-75 bg-transparent"
          onChange={(e)=>setConfirmPassword(e.target.value)}
        />

        <h1 className="pl-16 mt-1  text-gray-400">
  Already have an account?
  <Link to="/login" className="text-blue-400 ml-1 hover:underline">
    Login
  </Link>
</h1>

        <button onClick={handleSignUp} className="mt-3 w-full bg-indigo-500 hover:bg-indigo-600 transition duration-200 text-white font-semibold py-2 rounded-xl shadow-md">
          Sign Up
        </button>
        <div className='flex justify-center'> 
            <button className='mt-4 gap-3 bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-500 w-100'
            onClick={() => {
              window.location.href = "http://localhost:3000/auth/google"
            }}
          >
            Continue with Google
          </button>
          </div>

      </div>

    </div>
    </>
  )
}

export default SignUp