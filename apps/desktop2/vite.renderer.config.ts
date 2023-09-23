import ftl from "@muzik/vite-plugin-ftl";
import {vanillaExtractPlugin} from "@vanilla-extract/vite-plugin";
import reactPlugin from "@vitejs/plugin-react-swc";
import {defineConfig} from "vite";
import inspect from "vite-plugin-inspect";

export default defineConfig({
    plugins: [reactPlugin(), vanillaExtractPlugin(), ftl(), inspect()]
});
