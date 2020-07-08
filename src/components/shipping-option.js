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
import { changeShippingOption } from '../store/actions.js';

const onShippingOptionChanged = e => {
  if (e.target.value != '')
    store.dispatch(changeShippingOption(e.target.value));
}

export const ShippingOption = shippingOptions => {
  return html`
    <mwc-select
      id="shipping-option"
      label="Shipping option:"
      @selected="${onShippingOptionChanged}">
      ${shippingOptions.map(option => html`
      <mwc-list-item
        twoline
        ?selected="${option.selected}"
        value="${option.id}">
          <span>${option.label}</span>
          <span slot="secondary">
            ${option.amount.value}
            ${option.amount.currency}
        </span>
      </mwc-list-item>`)}
    </mwc-select>`;
};

