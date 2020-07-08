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
const express = require('express');
const router = express.Router();

const origin = process.env.ORIGIN;

const addresses = [
  {
    id: 'address-1',
    label: 'US address',
    selected: true,
    addressLine: [
      '1600 Amphitheatre Parkway'
    ],
    city: 'Mountain View',
    country: 'US',
    dependentLocality: '',
    organization: 'Google',
    phone: '+16287588074',
    postalCode: '94043',
    recipient: 'Janelle Murrels',
    region: 'CA',
    sortingCode: '',
  }, {
    id: 'address-2',
    label: 'JP address',
    selected: false,
    addressLine: [
      'Shibuya Stream, 3-21-3 Shibuya'
    ],
    city: '',
    country: 'JP',
    dependentLocality: '',
    organization: 'Google Japan',
    phone: '+818011506480',
    postalCode: '150-0002',
    recipient: 'Janelle Murells',
    region: 'Tokyo',
    sortingCode: '',
  }
];

const paymentMethods = [{
  id: `${origin}`,
  label: 'Payment 1',
  selected: true
}, {
  id: `${origin}/another-pay`,
  label: 'Payment 2 ($10 discount!)',
  selected: false
}];

router.get('/address', (req, res) => {
  res.json(addresses);
});

router.get('/payment-methods', (req, res) => {
  res.json(paymentMethods);
});

module.exports = router;
