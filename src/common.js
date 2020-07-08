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
const snackbar = document.querySelector('#snackbar');
export const toast = text => {
  snackbar.labelText = text;
  snackbar.show();
}

export class SWController {
  constructor(client, paymentMethods, addresses) {
    this.client = client;

    this.setPaymentMethods(paymentMethods);
    this.setShippingAddresses(addresses);
    this.shippingOptionId = null;
    this.shippingOptions = [];
    this.paymentOptions = null;
    this.total = null;
  }
  getReady(readyObj) {
    this.setShippingOptions(readyObj.shippingOptions);
    this.paymentOptions = readyObj.paymentOptions;
    this.total = readyObj.total;
  }
  update(paymentRequestUpdate) {
    this.setShippingOptions(paymentRequestUpdate.shippingOptions);
    this.total = paymentRequestUpdate.total;
  }
  setPaymentMethods(paymentMethods) {
    this.paymentMethods = paymentMethods;
    for (let method of this.paymentMethods) {
      if (method.selected) this.paymentMethodId = method.id;
    }
  }
  getPaymentMethod() {
    const paymentMethod = this.paymentMethods.find(method => {
      return method.id == this.paymentMethodId;
    });
    return paymentMethod || null;
  }
  setShippingAddresses(shippingAddresses) {
    this.shippingAddresses = shippingAddresses;
    for (let address of this.shippingAddresses) {
      if (address.selected) this.shippingAddressId = address.id;
    }
  }
  getShippingAddress() {
    const shippingAddress = this.shippingAddresses.find(address => {
      return address.id == this.shippingAddressId;
    });
    return shippingAddress || null;
  }
  setShippingOptions(shippingOptions) {
    this.shippingOptions = shippingOptions;
    if (!this.shippingOptions) return;
    for (let option of this.shippingOptions) {
      if (option.selected) this.shippingOptionId = option.id;
    }
  }
  // TODO: Add contact information delegation
  postMessage(message, contents) {
    this.client.postMessage({
      message: message,
      contents: contents
    });
  }
  windowReady() {
    this.postMessage('payment_app_window_ready');
  }
  paymentReady(paymentMethodData) {
    this.postMessage('payment_ready', paymentMethodData);
  }
  paymentMethodChange(paymentMethodId) {
    this.paymentMethodId = paymentMethodId;
    this.postMessage('payment_method_changed', {
      methodName: this.paymentMethodId
    });
  }
  shippingAddressChange(shippingAddressId) {
    this.shippingAddressId = shippingAddressId;
    this.postMessage('shipping_address_change', {
      shippingAddress: this.getShippingAddress()
    });
  }
  shippingOptionChange(shippingOptionId) {
    this.shippingOptionId = shippingOptionId;
    this.postMessage('shipping_option_change', {
      optionId: this.shippingOptionId
    });
  }
  authorize() {
    // Return `PaymentResponseHandler` object
    // https://w3c.github.io/payment-handler/#paymenthandlerresponse-dictionary
    const paymentHandlerResponse = {
      methodName: this.paymentMethodId,
      details: { id: '123456' },
      payerName: 'Dummy',
      payerEmail: 'Dummy',
      payerPhone: 'Dummy',
      shippingAddress: this.getShippingAddress(),
      shippingOption: this.shippingOptionId
    }
    console.log(paymentHandlerResponse);
    this.postMessage('authorized', paymentHandlerResponse);
  }
  cancel() {
    this.postMessage('canceled', {
      message: 'The payment request is cancelled by user'
    });
  }
}
