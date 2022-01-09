const withTM = require("next-transpile-modules");
const withImages = require("next-images");
const withPWA = require("next-pwa");
const runtimeCaching = require("./cache");

let transpileModules = [
  "tuteria-frontend-components",
  "@tuteria/shared-lib",
  "@gbozee/tuteria-design-system",
  "@tuteria/tuteria-data",
];
// module.exports = withPWA(
module.exports = withImages(
  withTM({
    // pwa: {
    //   dest: "public",
    //   runtimeCaching,
    // },
    transpileModules,
    loaderFunc: (library) => {
      library.options.plugins = [
        require("@babel/plugin-transform-flow-strip-types"),
        // require("emotion")
      ];
      return library;
    },
    webpack(config, options) {
      config.module.rules.push({
        test: /\.svg$/,
        use: ["@svgr/webpack"],
      });

      return config;
    },
    webpackDevMiddleware(config, options) {
      config.watchOptions.ignored = config.watchOptions.ignored.filter(
        (ignore) => !ignore.toString().includes("node_modules")
      );
      // Ignore all node modules except those here.
      config.watchOptions.ignored = [
        ...config.watchOptions.ignored,
        /node_modules\/(?!@tuteria\/.+)/,
        /\@tuteria\/.+\/node_modules/,
        // /node_modules([\\]+|\/)+(?!@tuteria[\\/]shared-lib)/,
        // /node_modules([\\]+|\/)+(?!@tuteria[\\/]tuteria-data)/,
        // /\@tuteria[\\/]shared-lib([\\]+|\/)node_modules/,
        // /\@tuteria[\\/]tuteria-data([\\]+|\/)node_modules/,
      ];
      return config;
    },
    assetPrefix: process.env.BASE_PATH || "",
    publicRuntimeConfig: {
      basePath: process.env.BASE_PATH || "",
    },
    reactStrictMode: true,
  })
);
// );
