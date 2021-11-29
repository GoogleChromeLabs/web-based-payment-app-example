/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const src = path.join(__dirname, 'src');
const dst = path.join(__dirname, 'dist');

module.exports = {
  mode: "development",
  devtool: 'inline-source-map',
  entry: {
    'pay': path.join(src, 'pay.js'),
    'index': path.join(src, 'index.js'),
    'payment-handler': path.join(src, 'payment-handler.js')
  },
  output: {
    path: dst,
    filename: '[name].js'
  },
  devServer: {
    contentBase: __dirname,
    port: 8080,
    hot: true
  },
  // module: {
  //   rules: [{
  //     test: /\.ts$/,
  //     loader: 'ts-loader',
  //     exclude: /node_modules/
  //   }, {
  //     test: /\.js$/,
  //     loader: 'babel-loader',
  //     exclude: /node_modules/
  //   }]
  // },
  resolve: {
    extensions: [ '.ts', '.js' ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{
        from: path.join(__dirname, 'public'),
        to: path.join(dst)
      }]
    // },{
    //   from: path.join(src, 'img'),
    //   to: path.join(dst, 'img')
    // },{
    //   from: path.join(src, 'styles'),
    //   to: path.join(dst, 'styles')
    // },{
    //   from: path.join(src, '*.html'),
    //   to: dst,
    //   flatten: true
    // },{
    //   from: path.join(src, 'manifest.json'),
    //   to: path.join(dst, 'manifest.json')
    })
  ]
}