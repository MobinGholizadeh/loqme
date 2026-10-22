import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "لقمه | عرضه هوشمند مازاد روزانه غذا",
    short_name: "لقمه",
    description:
      "کشف و رزرو بسته‌های تازه فروشگاه‌های ارومیه، با قیمت کمتر و زمان دریافت حضوری مشخص",
    id: "/",
    scope: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    orientation: "portrait",
    dir: "rtl",
    lang: "fa-IR",
    icons: [
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
