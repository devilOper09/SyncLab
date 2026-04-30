import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../Api/Api.js'
import { useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import { RectangleGogglesIcon } from 'lucide-react'

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();


  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const res = await api.post("/auth/login", {
        email,
        password
      })
      if (res.data.message === "Login Successful") {
        localStorage.setItem("user", email)
        navigate("/home")


      }
      console.log(res.data)
    } catch (error) {
      console.log(err.response.data);
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
            className="border border-gray-600 rounded-xl p-2 mt-6 w-full opacity-75 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="border border-gray-600 rounded-xl p-2 mt-5 w-full opacity-75 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(e) => setPassword(e.target.value)}
          />
          <h1 className='pl-16 mt-1 text-gray-400'>
            Don't have an account?
            <Link to="/Signup" className="text-blue-400 ml-1 hover:underline">Sign up!</Link>
          </h1>

          <button onClick={handleLogin} className="mt-3 w-full bg-indigo-500 hover:bg-indigo-600 transition duration-200 text-white font-semibold py-2 rounded-xl shadow-md">
            Login
          </button>
          <div className='flex justify-center'> 
            <button className='w-100 mt-4 gap-3 bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-500'
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

export default Login