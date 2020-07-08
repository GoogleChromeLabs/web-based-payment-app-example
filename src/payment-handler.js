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
import { PromiseResolver } from './promise-resolver.js';

const origin = location.origin;
const methodName = `${origin}`;
const checkoutURL = `${origin}/pay`;

let cc;

class FrontendController {
  // Restore `PaymentRequestEvent`
  // https://w3c.github.io/payment-handler/#the-paymentrequestevent
  constructor(event) {
    this.resolver = new PromiseResolver();
    this.pre = event;
    this.pre.respondWith(this.resolver.promise);
  }
  async appendClient(client) {
    // TODO: If you want to just one session at one time,
    // don't overwrite the `client`.
    this.client = client;
  }
  async postMessage(message, contents) {
    if (!this.client) {
      throw 'Client not set.';
    }
    this.client.postMessage({
      ...contents,
      type: message,
    });
  }
  async paymentReady() {
    // TODO: Pass sequence of `AddressInit`, sequence of `paymentMethods`
    this.postMessage('payment_ready', {
      requestBillingAddress: this.pre.requestBillingAddress,
      total: this.pre.total,
      paymentOptions: this.pre.paymentOptions,
      shippingOptions: this.pre.shippingOptions
    });
  }
  async changePaymentMethod(newMethod) {
    // Notify the merchant and receive updated payment details
    const update = await this.pre.changePaymentMethod(newMethod, {});
    await this.updateRequest(update);
  }
  async changeShippingAddress(newAddress) {
    // (optional AddressInit `shippingAddress = {}`)
    const update = await this.pre.changeShippingAddress(newAddress);
    await this.updateRequest(update);
  }
  async changeShippingOption(newShippingOption) {
    // (DOMString shippingOption);
    const update = await this.pre.changeShippingOption(newShippingOption);
    await this.updateRequest(update);
  }
  async updateRequest(detailsUpdate) {
    this.postMessage('update_request', detailsUpdate);
  }
  async authorize(paymentHandlerResponse) {
    this.resolver.resolve(paymentHandlerResponse);
  }
  async cancel(text) {
    return this.resolver.reject(text);
  }
}

self.addEventListener('message', async e => {
  if (!cc) return;
  switch (e.data.message) {
    case 'payment_app_window_ready':
      try {
        await cc.appendClient(e.source);
        await cc.paymentReady();
      } catch (e) {
        throw e;
      }
      break;
    case 'payment_method_changed':
      if (!e.data.contents.methodName) break;
      await cc.changePaymentMethod(e.data.contents.methodName);
      break;
    case 'shipping_address_change':
      if (!e.data.contents.shippingAddress) break;
      await cc.changeShippingAddress(e.data.contents.shippingAddress);
      break;
    case 'shipping_option_change':
      if (!e.data.contents.optionId) break;
      await cc.changeShippingOption(e.data.contents.optionId);
      break;
    case 'authorized':
      await cc.authorize(e.data.contents);
      cc = null;
      break;
    case 'canceled':
      await cc.cancel();
      cc = null;
      break;
    default:
      break;
  }
});

self.addEventListener('paymentrequest', e => {
  cc = new FrontendController(e);
  e.openWindow(checkoutURL);
});

self.addEventListener('canmakepayment', e => {
  e.respondWith(true);
});
