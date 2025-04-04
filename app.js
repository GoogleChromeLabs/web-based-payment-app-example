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
'use strict';

let express = require('express');
let app = express();

// All of our paths have the Link header.
app.use(function(req, res, next) {
  res.status(200).links({
    'payment-method-manifest':
        'https://bobbucks.dev/pay/payment-manifest.json',
    });
    return next();
});

// Serve the payment-manifest.json file with its own mime type.
app.use(function(req, res, next) {
  if (req.path.endsWith('payment-manifest.json')) {
    res.set('Content-Type', 'application/x-payment-manifest');
  }
  return next();
});

// Discourage client-side caching of manifest files, so that clients can pick
// up changes as far as possible.
app.use(function(req, res, next) {
  if (req.path.endsWith('manifest.json')) {
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Expires", "0");
  }
  return next();
});

// We are mostly a static website.
app.use(express.static('public'));

/**
 * Starts the server.
 */
if (module === require.main) {
  let server = app.listen(process.env.PORT || 8080, function() {
    console.log('App listening on port %s', server.address().port);
  });
}

module.exports = app;
