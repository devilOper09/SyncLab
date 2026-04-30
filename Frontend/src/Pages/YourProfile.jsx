import React from 'react'

function YourProfile() {
  return (
    <div className="ml-64 mt-16 p-6 text-white">

      <div></div>
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-gray-700 rounded-full"></div>

        <div>
          <h1 className="text-xl font-bold">Tensick</h1>
          <p className="text-gray-400">@tensick</p>
          <p className="text-blue-400 text-sm">Producer</p>
        </div>
      </div>

      {/* Bio */}
      <p className="mt-4 text-gray-300 max-w-md">
        Making dark trap beats and experimental sounds.
      </p>

    </div>
  )
}

export default YourProfile