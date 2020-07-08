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
import '@material/mwc-top-app-bar-fixed';
import '@material/mwc-button';
import '@material/mwc-formfield';
import '@material/mwc-switch';
import '@material/mwc-snackbar';

import { html, render } from 'lit-html';
import { toast } from './common.js';

const origin = location.origin;
const buttonArea = document.querySelector('#button_area');
let registration;

const register = async e => {
  // Load and register pre-caching Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('payment-handler.js');
    registration = await navigator.serviceWorker.ready;
    if (!registration.paymentManager) {
      return;
    }
    await registration.paymentManager.instruments.set(
      "instrument-id-1",
      {
        name: 'Payment Method 1',
        method: [`${origin}`]
      }
    );
    await registration.paymentManager.instruments.set(
      "instrument-id-2",
      {
        name: 'Payment Method 2',
        method: [`${origin}/another-pay`]
      }
    );
    const delegation = document.querySelector('#delegation');
    if (delegation.checked) {
      await registration.paymentManager.enableDelegations([
        'shippingAddress', 'payerName', 'payerPhone', 'payerEmail'
      ]);
    }
    toast('Service worker registered!');
  }
  renderButtons();
};

const unregister = async e => {
  if (registration) {
    await registration.unregister();
    registration = null;
    toast('Service worker unregistered.');
  }
  renderButtons();
};

const renderButtons = () => {
  render(html`
    ${'serviceWorker' in navigator ? html`
    ${registration ? html`
    <div class="buttons">
      <mwc-button id="unregister" @click="${unregister}">Unregister</mwc-button>
    </div>` : html`
    <div class="buttons">
      <mwc-formfield label="Enable delegation">
        <mwc-switch id="delegation" checked></mwc-switch>
      </mwc-formfield>
    </div>
    <div class="buttons">
      <mwc-button id="register" @click="${register}" raised>Register</mwc-button>
    </div>`}` : ''}`, buttonArea);
};

document.addEventListener('DOMContentLoaded', async e => {
  if ('serviceWorker' in navigator) {
    registration = await navigator.serviceWorker.getRegistration();
  }
  renderButtons();
});
