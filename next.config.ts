import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Un package-lock.json traîne dans le dossier parent (C:\Users\KOFI) ; on
  // ancre explicitement la racine de traçage sur ce projet.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
