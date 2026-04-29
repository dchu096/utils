import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => ({
    plugins: [
        {
            name: "simpleanalytics",
            transformIndexHtml(html) {
                const file = mode === "development" ? "latest.dev.js" : "latest.js";
                return {
                    html,
                    tags: [
                        {
                            tag: "script",
                            attrs: {
                                async: true,
                                src: `https://scripts.simpleanalyticscdn.com/${file}`,
                            },
                            injectTo: "head",
                        },
                        {
                            tag: "noscript",
                            children: '<img src="https://queue.simpleanalyticscdn.com/noscript.gif" alt="" referrerpolicy="no-referrer-when-downgrade" />',
                            injectTo: "body",
                        },
                    ],
                };
            },
        },
        react(),
        tailwindcss(),
    ],
    build: {
        rollupOptions: {
            input: {
                home: "index.html",
                encodingBase64Url: "encoding/base64-url/index.html",
                encodingJwt: "encoding/jwt/index.html",
                encodingSshKey: "encoding/ssh-key/index.html",
                encodingUuid: "encoding/uuid/index.html",
                cron: "cron/index.html",
                designCssGradient: "design/css-gradient/index.html",
                designQrCode: "design/qr-code/index.html",
                discordWebhook: "discord/webhook/index.html",
                discordTimestamp: "discord-timestamp/index.html",
                mcmotd: "mcmotd/index.html",
                minecraftFlags: "minecraft/flags/index.html",
                minecraftGradientText: "minecraft/gradient-text/index.html",
                minecraftMiniMessage: "minecraft/minimessage/index.html",
                securityExtractPublicKey: "security/extract-public-key/index.html",
                securityJwkGenerate: "security/jwk-generate/index.html",
                securityJwkToPem: "security/jwk-to-pem/index.html",
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
}));
