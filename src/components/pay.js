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
import { html } from 'lit-html';
import { store } from '../store/store.js';
import { PaymentMethod } from './payment-method.js';
import { ShippingAddress } from './shipping-address.js';
import { ShippingOption } from './shipping-option.js';
import {
  cancelPayment,
  authorizePayment
} from '../store/actions.js';

const onCancel = e => {
  e.preventDefault();
  store.dispatch(cancelPayment());
};

const onPay = e => {
  e.preventDefault();
  const {
    paymentMethods,
    shippingAddresses,
    shippingOptions
  } = store.getState();
  const paymentMethod = paymentMethods.find(method => method.selected);
  const shippingAddress = shippingAddresses.find(address => address.selected);
  const shippingOption = shippingOptions.find(option => option.selected);
  store.dispatch(authorizePayment(
    paymentMethod.id,
    shippingAddress,
    shippingOption.id));
};

export const Pay = state => {
  return html`
    <mwc-linear-progress ?indeterminate="${state.progress}"></mwc-linear-progress>
    <main class="card">
      <div>You are about to make payment:</div>
      <div class="price">
        <strong id="price">
        ${state.total ? html`
        ${parseInt(state.total.value).toFixed(2)} ${state.total.currency}
        `:''}
        </strong>
      </div>
      <div>${PaymentMethod(state.paymentMethods)}</div>
      ${state.options && state.options.requestShipping ? html`
      <div>${ShippingAddress(state.shippingAddresses)}</div>
      <div>${ShippingOption(state.shippingOptions)}</div>`:''}
      <div class="buttons">
        <mwc-button @click="${onCancel}">Cancel</mwc-button>
        <mwc-button @click="${onPay}" raised>Pay</mwc-button>
      </div>
    </main>
    <mwc-snackbar labelText="${state.labelText}"></mwc-snackbar>`;
}