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
export const INIT = 'INIT';
export const WINDOW_READY = 'WINDOW_READY';
export const PAYMENT_READY = 'PAYMENT_READY';
export const UPDATE_REQUEST = 'UPDATE_REQUEST';
export const CHANGE_PAYMENT_METHOD = 'CHANGE_PAYMENT_METHOD';
export const CHANGE_SHIPPING_ADDRESS = 'CHANGE_SHIPPING_ADDRESS';
export const CHANGE_SHIPPING_OPTION = 'CHANGE_SHIPPING_OPTION';
export const AUTHORIZE_PAYMENT = 'AUTHORIZE_PAYMENT';
export const CANCEL_PAYMENT = 'CANCEL_PAYMENT';

export const init = () => {
  return { type: INIT };
};

export const windowReady = (paymentMethods, shippingAddresses) => {
  return { type: WINDOW_READY, paymentMethods, shippingAddresses };
};

export const paymentReady = (
  requestBillingAddress,
  total,
  options,
  shippingOptions,
) => {
  return {
    type: PAYMENT_READY,
    requestBillingAddress,
    total,
    options,
    shippingOptions,
  };
};

export const updateRequest = ( shippingOptions, total, ) => {
  return { type: UPDATE_REQUEST, shippingOptions, total };
}

export const changePaymentMethod = paymentMethodId => {
  return { type: CHANGE_PAYMENT_METHOD, paymentMethodId };
};

export const changeShippingAddress = shippingAddress => {
  return { type: CHANGE_SHIPPING_ADDRESS, shippingAddress };
};

export const changeShippingOption = shippingOptionId => {
  return { type: CHANGE_SHIPPING_OPTION, shippingOptionId };
};

export const authorizePayment = (
  paymentMethodId,
  shippingAddress,
  shippingOptionId
) => {
  return {
    type: AUTHORIZE_PAYMENT,
    paymentMethodId,
    shippingAddress,
    shippingOptionId
  }
}

export const cancelPayment = () => {
  return { type: CANCEL_PAYMENT }
}