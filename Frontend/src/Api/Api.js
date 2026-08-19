import axios from "axios"

const api = axios.create({
    baseURL: "https://synclab-x9qu.onrender.com"
})

export default api;