/** @type {import('next').NextConfig} */
const DOCKER_API_URL = "http://app-api:8000";
const LOCAL_API_URL = "http://localhost:8000";
const API_PATH = "/api/py";

const nextConfig = {
  rewrites: async () => {
    // Use LOCAL_API_URL for single container or local dev, 
    // Use DOCKER_API_URL for Docker multi-container (docker-compose.yml)
    const baseApiUrl =
      process.env.DOCKER_ENV === "true"
        ? process.env.DEPLOYMENT_MODE === "single"
          ? LOCAL_API_URL
          : DOCKER_API_URL
        : LOCAL_API_URL;

    console.log("Environment Config:", {
      DOCKER_ENV: process.env.DOCKER_ENV,
      DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE,
      baseApiUrl,
    });

    return [
      {
        source: `${API_PATH}/:path*`,
        destination: `${baseApiUrl}${API_PATH}/:path*`,
      },
      {
        source: "/docs",
        destination: `${baseApiUrl}${API_PATH}/docs`,
      },
      {
        source: "/openapi.json",
        destination: `${baseApiUrl}${API_PATH}/openapi.json`,
      },
    ];
  },
};

module.exports = nextConfig;
