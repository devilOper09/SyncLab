import React from 'react'
import { useEffect, useState } from 'react';
import axios from 'axios';
import UserNavbar from '../components/UserNavbar';
import Sidebar from '../components/sidebar';


function Home() {
  const [posts, setPosts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState("");

  useEffect(()=>{
    fetchPosts();
  },[])

  const fetchPosts = async () =>{
    const res = await axios.get("http://localhost:3000/api/posts");
    setPosts(res.data);
  }

  const handlePost = async () => {
    await axios.post("http://localhost:3000/api/posts", {
  userName: "Tensick",
  caption,
});

setCaption("");
setShowForm(false);
fetchPosts();

}

  return (
    <div>
        <UserNavbar />
        <Sidebar />

        <div className='max-w-xl mx-auto p-4'>
          {posts.map((post) => (
  <div key={post._id} className="border p-4 mb-4 rounded-lg">
    <h3 className="font-bold">{post.userName}</h3>
    <p>{post.caption}</p>
  </div>
))}

        </div>
            <button
        className="fixed bottom-6 right-6 bg-black text-white w-14 h-14 rounded-full text-3xl flex items-center justify-center"
        onClick={() => setShowForm(true)}
      >
        +
      </button>


        
 {showForm && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg w-80">
            <textarea
              className="w-full border p-2 mb-4"
              placeholder="Write something..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />

            <button
              className="w-full bg-black text-white p-2"
              onClick={handlePost}
            >
              Post
            </button>

            <button
              className="mt-2 w-full text-red-500"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


export default Home;