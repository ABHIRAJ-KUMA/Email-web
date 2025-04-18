require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const API_CONFIG = {
  unsplash: {
    baseUrl: "https://api.unsplash.com",
    endpoint: "/search/photos",
    key: process.env.UNSPLASH_ACCESS_KEY,
    params: (term) => ({ query: term, per_page: 12 }),
  },
  pexels: {
    baseUrl: "https://api.pexels.com",
    endpoint: "/v1/search",
    key: process.env.PEXELS_API_KEY,
    params: (term) => ({ query: term, per_page: 12 }),
  },
  pixabay: {
    baseUrl: "https://pixabay.com/api",
    endpoint: "",
    key: process.env.PIXABAY_API_KEY,
    params: (term) => ({ q: term, per_page: 12 }),
  },
  flickr: {
    baseUrl: "https://api.flickr.com/services/rest",
    endpoint: "",
    key: process.env.FLICKR_API_KEY,
    params: (term) => ({
      method: "flickr.photos.search",
      text: term,
      per_page: 12,
      format: "json",
      nojsoncallback: 1,
    }),
  },
};

app.get("/", (req, res) => {
  res.render("index", {
    apiServices: Object.keys(API_CONFIG),
    images: [],
    error: null,
    name: "",
    email: "",
    searchTerm: "",
    apiService: "unsplash",
  });
});

app.post("/search", async (req, res) => {
  const { name, email, searchTerm, apiService } = req.body;

  try {
    const images = await fetchImages(searchTerm, apiService);
    res.render("index", {
      apiServices: Object.keys(API_CONFIG),
      images,
      error: null,
      name,
      email,
      searchTerm,
      apiService,
    });
  } catch (error) {
    console.error("Error:", error);
    res.render("index", {
      apiServices: Object.keys(API_CONFIG),
      images: [],
      error: "Failed to fetch images. Please try again.",
      name,
      email,
      searchTerm,
      apiService,
    });
  }
});

async function fetchImages(searchTerm, apiService) {
  const config = API_CONFIG[apiService];
  if (!config) throw new Error("Invalid API service");

  const params = config.params(searchTerm);
  const url = `${config.baseUrl}${config.endpoint}`;

  const response = await axios.get(url, {
    params: {
      ...params,
      [apiService === "flickr" ? "api_key" : "key"]: config.key,
    },
    headers: apiService === "pexels" ? { Authorization: config.key } : {},
  });

  return parseResponse(response.data, apiService);
}

function parseResponse(data, apiService) {
  switch (apiService) {
    case "unsplash":
      return data.results.map((img) => ({
        url: img.links.html,
        src: img.urls.regular,
        alt: img.alt_description || "Unsplash image",
        photographer: img.user.name,
        apiUrl: "https://unsplash.com",
        api: "Unsplash",
      }));

    case "pexels":
      return data.photos.map((img) => ({
        url: img.url,
        src: img.src.medium,
        alt: img.photographer || "Pexels image",
        photographer: img.photographer,
        apiUrl: "https://pexels.com",
        api: "Pexels",
      }));

    case "pixabay":
      return data.hits.map((img) => ({
        url: `https://pixabay.com/photos/${img.id}/`,
        src: img.webformatURL,
        alt: img.tags || "Pixabay image",
        photographer: img.user,
        apiUrl: "https://pixabay.com",
        api: "Pixabay",
      }));

    case "flickr":
      return data.photos.photo.map((img) => ({
        url: `https://www.flickr.com/photos/${img.owner}/${img.id}`,
        src: `https://live.staticflickr.com/${img.server}/${img.id}_${img.secret}_w.jpg`,
        alt: img.title || "Flickr image",
        photographer: img.owner,
        apiUrl: "https://flickr.com",
        api: "Flickr",
      }));

    default:
      return [];
  }
}
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("index", {
    apiServices: Object.keys(API_CONFIG),
    images: [],
    error: "Something went wrong!",
    name: req.body.name || "",
    email: req.body.email || "",
    searchTerm: req.body.searchTerm || "",
    apiService: req.body.apiService || "unsplash",
  });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
