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
import { store } from './store.js';
import {
  WINDOW_READY,
  CHANGE_PAYMENT_METHOD,
  CHANGE_SHIPPING_ADDRESS,
  CHANGE_SHIPPING_OPTION,
  AUTHORIZE_PAYMENT,
  CANCEL_PAYMENT,
  paymentReady,
  updateRequest,
} from './actions.js';

let controller;
if (navigator.serviceWorker.controller) {
  controller = navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('message', e => {
    let requestBillingAddress,
        total,
        paymentOptions,
        shippingOptions;
    switch (e.data.type) {
      case 'payment_ready':
        ({
          requestBillingAddress,
          total,
          paymentOptions,
          shippingOptions,
        } = e.data);
        store.dispatch(paymentReady(
          requestBillingAddress,
          total,
          paymentOptions, // TODO: change to `options`
          shippingOptions,
        ));
        return;
      case 'update_request':
        ({
          shippingOptions,
          total,
        } = e.data);
        store.dispatch(updateRequest(
          shippingOptions,
          total
        ));
        return;
      default:
        return;
    }
  });
}

const postMessage = (message, contents) => {
  if (controller) {
    controller.postMessage({message, contents});
  } else {
    console.error('Service Worker not installed.');
  }
};

export const swController = store => next => action => {
  switch (action.type) {
    case WINDOW_READY:
      postMessage('payment_app_window_ready');
      return next(action);
    case CHANGE_PAYMENT_METHOD:
      postMessage('payment_method_changed', {
        methodName: action.paymentMethodId
      });
      return;
    case CHANGE_SHIPPING_ADDRESS:
      postMessage('shipping_address_change', {
        shippingAddress: action.shippingAddress
      });
      return;
    case CHANGE_SHIPPING_OPTION:
      postMessage('shipping_option_change', {
        optionId: action.shippingOptionId
      });
      return;
    case AUTHORIZE_PAYMENT:
      // Return `PaymentResponseHandler` object
      // https://w3c.github.io/payment-handler/#paymenthandlerresponse-dictionary
      const paymentHandlerResponse = {
        methodName: action.paymentMethodId,
        details: { id: '123456' },
        payerName: 'Dummy',
        payerEmail: 'Dummy',
        payerPhone: 'Dummy',
        shippingAddress: action.shippingAddress,
        shippingOption: action.shippingOptionId
      }
      postMessage('authorized', paymentHandlerResponse);
      return;
    case CANCEL_PAYMENT:
      postMessage('canceled', {
        message: 'The payment request is cancelled by user'
      });
      return;
    default:
      return next(action);
  }
};
