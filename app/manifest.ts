import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mountain Connects",
    short_name: "Mountain Connects",
    description:
      "The seasonal worker platform for ski resorts. Find winter jobs at ski resorts worldwide.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#0a1e33",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
