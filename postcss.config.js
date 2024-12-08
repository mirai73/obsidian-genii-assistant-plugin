// postcss.config.js
const autoprefixer = require("autoprefixer");
const tailwindcss = require("tailwindcss");
const postcssImport = require("postcss-import");
module.exports = {
	plugins: [
		autoprefixer,
		tailwindcss,
		postcssImport({
			path: ["src/styles"],
		}),
	],
};
