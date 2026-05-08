import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/*/admin",
          "/*/org/",
          "/*/team/",
          "/*/club/",
          "/*/referee/",
          "/*/draw/present",
          "/*/draw/created",
          "/*/draw/thanks",
          "/*/invite/",
          "/*/invites/",
          "/*/reset-password/",
          "/*/forgot-password",
          "/*/onboarding",
          "/api/",
        ],
      },
    ],
    sitemap: "https://goalityfootball.com/sitemap.xml",
  };
}
