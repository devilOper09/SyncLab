import { Routes, Route } from "react-router-dom"

import Login from "./Pages/login"
import SignUp from "./Pages/SignUp"
import Home from "./Pages/Home"
import PublicHome from "./Pages/PublicHome"
import Artists from "./Pages/Artists"
import Search from "./Pages/Search"
import Notifications from "./Pages/Notifications"
import Snippets from "./Pages/Snippets"
import YourProfile from "./Pages/YourProfile"


function App() {
  return (
    <div className="bg-black min-h-screen text-white">

      

      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/home" element={<Home />}/>
        <Route path="/setup-profile" element={<setUpProfile />}/>
        <Route path="/artist" element={<Artists />} />
        <Route path="/search" element={<Search />} />
        <Route path="/notification" element={<Notification />} />
        <Route path="/snippets" element={<Snippets />} />
        <Route path="/profile" element={<YourProfile />} />
      </Routes>

    </div>
  )
}

export default App
