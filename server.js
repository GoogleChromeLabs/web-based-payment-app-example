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
require('dotenv').config();
const express = require("express");
const app = express();
const hbs = require('hbs');
const cookieParser = require('cookie-parser');
const user = require('./libs/user');

let origin = process.env.ORIGIN;

const appName = 'BobBucks Pay';
const appShortName = 'BobBucks';

app.set('view engine', 'html');
app.engine('html', hbs.__express);
app.set('views', './views');

app.use(express.static('dist'));

app.use((req, res, next) => {
  if (!origin) {
    origin = `${req.headers.protocol||'http'}://${req.headers.host}`;
    console.log(`Origin: "${origin}" was set because it was undefined.`);
  }
  if (!/^http:\/\/localhost/.test(origin) &&
      req.get('x-forwarded-proto') &&
     (req.get('x-forwarded-proto')).split(',')[0] !== 'https') {
    return res.redirect(301, `${origin}`);
  }
  req.schema = 'https';
  next();
});

app.get("/", (req, res) => {
  res.append('Link', `<${origin}/payment-manifest.json>; rel="payment-method-manifest"`);
  res.render('index.html', {
    appName: appName,
    appShortName: appShortName
  });
});

app.get('/pay', (req, res) => {
  res.render('pay.html', {
    appName: appName,
    appShortName: appShortName
  });
});

app.get('/payment-manifest.json', (req, res) => {
  res.json({
    default_applications: [ `${origin}/manifest.json` ]
  });
});

app.get('/another-pay', (req, res) => {
  res.json({
    default_applications: [
      `${origin}/manifest.json`
    ]
  });
});

app.get('/manifest.json', (req, res) => {
  res.json({
    "name": appName,
    "short_name": appShortName,
    "description": "This is an example implementation of the Payment Handler API.",
    "icons": [
      {
        "src": "https://cdn.glitch.com/2679350d-65ff-4d8b-a9e1-8e275ae75d09%2Ficon-192x192.png?v=1590207706462",
        "sizes": "192x192",
        "type": "image/svg"
      },
      {
        "src": "https://cdn.glitch.com/2679350d-65ff-4d8b-a9e1-8e275ae75d09%2Ficon-512x512.png?v=1590207245192",
        "sizes": "512x512",
        "type": "image/png"
      }
    ],
    "serviceworker": {
      "src": "payment-handler.js"
    },
    "payment": {
      "supported_delegations": [
        "shippingAddress", "payerName", "payerEmail", "payerPhone"
      ]
    },
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#33AA33",
    "background_color": "#33AA33"
  });
});

app.get('/favicon.ico', (req, res) => {
  res.send('<svg xmlns="http://www.w3.org/2000/svg" height="512" viewBox="0 0 24 24" width="512"><path d="M0 0h24v24H0z" fill="none"/><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>');
});

app.use('/user', user);

// listen for requests :)
const listener = app.listen(process.env.PORT || 8080, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
