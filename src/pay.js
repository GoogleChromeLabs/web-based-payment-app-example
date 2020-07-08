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
import '@material/mwc-textfield';
import '@material/mwc-select';
import '@material/mwc-top-app-bar-fixed';
import '@material/mwc-list/mwc-list-item';
import '@material/mwc-button';
import '@material/mwc-snackbar';
import '@material/mwc-formfield';
import '@material/mwc-switch';
import '@material/mwc-linear-progress';

import { render } from 'lit-html';
import { store } from './store/store.js';
import { Pay } from './components/pay.js';
import {
  init,
  windowReady,
} from './store/actions.js';

store.dispatch(init());

const renderApp = () => {
  const state = store.getState();
  render(Pay(state), document.querySelector('#pay-container'));
}

/**
 * state {
 *   `paymentMethods`: Array of payment methods. Initialized by the server.
 *   `shippingAddresses`: Array of shipping addresses. Initialized by the server.
 *   `options`: Object of options. Initliazed by Payment Request Event.
 *   `shippingOptions`: Array of shipping options. Initliazed by Payment Request Event.
 *   `shippingOptionId`: Id of the shipping option. Initliazed by Payment Request Event.
 *   `total`: Object of total. Initliazed by Payment Request Event.
 *   `progress`: Boolean
 *   `labelText`: String of error
 * }
 */

document.addEventListener('DOMContentLoaded', async e => {
  // Fetch address information tied to this customer.
  const result = await Promise.all([
    fetch('/user/address'),
    fetch('/user/payment-methods')
  ]);
  const [ addresses, paymentMethods ] = await Promise.all([
    result[0].json(),
    result[1].json()
  ]);
  store.dispatch(windowReady(paymentMethods, addresses));
  // progress.indeterminate = false;
  store.subscribe(renderApp);
  renderApp();
});

renderApp();
