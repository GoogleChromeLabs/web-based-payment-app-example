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
        'https://bobpay.xyz/pay/payment-manifest.json',
    });
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
