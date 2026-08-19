import axios from "axios"

const api = axios.create({
    baseURL: "https://synclab-xq0u.onrender.com"
})

export default api;