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
import { changeShippingAddress } from '../store/actions.js';

const onShippingAddressChanged = e => {
  const { shippingAddresses } = store.getState();
  const shippingAddress = shippingAddresses.find(address => {
    return address.id === e.target.value;
  });
  if (shippingAddress)
    store.dispatch(changeShippingAddress(shippingAddress));
};

export const ShippingAddress = shippingAddresses => {
  return html`
    <mwc-select
      label="Ship to:"
      @selected="${onShippingAddressChanged}">
      ${shippingAddresses.map(address => html`
      <mwc-list-item
        twoline
        ?selected="${address.selected}"
        value="${address.id}">
          <span>${address.label}</span>
          <span slot="secondary">
          ${address.city}
          ${address.region}
          ${address.country}
          </span>
      </mwc-list-item>`)}
    </mwc-select>`;
}
