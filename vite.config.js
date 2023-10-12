import {defineConfig} from "vite";
import {svelte} from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
    base: "chat-overlay",
    plugins: [svelte()],
    optimizeDeps: {
        exclude: ["tinro"],
    },
    server: {
        hmr: false,
    },
    test: {
        environment: "jsdom",
    },
});
