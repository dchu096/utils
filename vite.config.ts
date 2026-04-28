import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        home: "index.html",
        encodingBase64Url: "encoding/base64-url/index.html",
        encodingJwt: "encoding/jwt/index.html",
        encodingSshKey: "encoding/ssh-key/index.html",
        encodingUuid: "encoding/uuid/index.html",
        cron: "cron/index.html",
        discordTimestamp: "discord-timestamp/index.html",
        mcmotd: "mcmotd/index.html",
        textMarkdown: "text/markdown/index.html",
        textRegex: "text/regex/index.html",
        timeTimestamp: "time/timestamp/index.html",
        validatorsYaml: "validators/yaml/index.html",
        validatorsJson: "validators/json/index.html",
        validatorsToml: "validators/toml/index.html",
        yamlValidator: "yaml-validator/index.html",
      },
    },
  },
});
