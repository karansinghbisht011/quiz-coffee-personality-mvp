import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development only: Next.js blocks its dev scripts for any host other than localhost, so a phone (or another
  // computer) opening http://<this Mac's address>:3000 gets a page that never loads its menus. List this Mac's
  // network address here (it is printed as "Network:" by `npm run dev`; change it if the address changes).
  allowedDevOrigins: ["192.168.68.103"],
};

export default nextConfig;
