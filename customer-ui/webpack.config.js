const path = require('path')
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
   plugins: [
      new NodePolyfillPlugin()
  ],
   entry: path.join(__dirname, 'src/js', 'index.js'),
   output: {
      path: path.join(__dirname, 'dist'),
      filename: 'build.js'
   },
   module: {
      rules: [{
         test: /\.css$/,
         use: ['style-loader', 'css-loader'],
         include: /src/
      }, {
         test: /\.jsx?$/,
         loader: 'babel-loader',
         exclude: /node_modules/,
         options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
         }
      }]
   }
}
