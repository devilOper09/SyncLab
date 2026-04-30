import React from 'react'
import { Link } from 'react-router-dom'

function Sidebar() {
  return (
    <div className='w-64 p-6w-64 h-screen bg-black text-white p-6 flex flex-col fixed left-0 top-19 border-r border-blue-500/20'>
        <ul className='space-y-4'>
          <li><Link to="/profile" className='block px-4 py-2 rounded-lg hover:bg-blue-500/20 hover:text-blue-400 transition'>Your Profile</Link></li>
          <li><Link to="/artists" className='block px-4 py-2 rounded-lg hover:bg-blue-500/20 hover:text-blue-400 transition'>Artists</Link></li>
          <li><Link to="/notification" className='block px-4 py-2 rounded-lg hover:bg-blue-500/20 hover:text-blue-400 transition'>Notifications</Link></li>
          <li><Link to="/trending" className='block px-4 py-2 rounded-lg hover:bg-blue-500/20 hover:text-blue-400 transition'>Trending</Link></li>
          <li><Link to="/snippets" className='block px-4 py-2 rounded-lg hover:bg-blue-500/20 hover:text-blue-400 transition'>Snippits</Link></li>
          <li><Link to="/search" className='block px-4 py-2 rounded-lg hover:bg-blue-500/20 hover:text-blue-400 transition'>Search</Link></li>
          
        </ul>



    </div>
  )
}

export default Sidebar