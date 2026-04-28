import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        home: "index.html",
        cron: "cron/index.html",
        mcmotd: "mcmotd/index.html",
        discordTimestamp: "discord-timestamp/index.html",
        validatorsYaml: "validators/yaml/index.html",
        validatorsJson: "validators/json/index.html",
        validatorsToml: "validators/toml/index.html",
        yamlValidator: "yaml-validator/index.html",
      },
    },
  },
});
