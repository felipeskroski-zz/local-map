var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  entry: ["./src/app.js", './src/sass/styles.scss'],
  output: {
    filename: "dist/bundle.js"
  },
  module: {
    rules: [
      { // sass / scss loader for webpack
        test: /\.(sass|scss)$/,
        loader: ExtractTextPlugin.extract(['css-loader', 'sass-loader'])
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env'],
          }
        }
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin({ // define where to save the file
      filename: 'dist/bundle.css',
      allChunks: true,
    }),
  ]
}
