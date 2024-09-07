const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

let webpackConfig = {
  mode: "development", // 开发模式
  devtool: "cheap-module-eval-source-map", // sourcecode 用来调试打包后的代码
  entry: { index: "./src/index.js" },
  resolve: {
    extensions: [".js"], // 模块扩展名
    alias: {
      // 配置别名
      src: path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ["babel-loader"],
        include: path.join(__dirname, "src"),
        exclude: path.join(__dirname, "node_modules"),
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, `dist`),
    filename: "[name].js",
    chunkFilename: "[id].[hash:7].js",
  },
  devServer: {
    contentBase: path.resolve(__dirname, "dist"),
    port: 9000,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      inject: "head", // 注入到head标签内 默认body
    }),
  ],
};

module.exports = webpackConfig;
