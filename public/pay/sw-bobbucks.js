'use strict';

// --- Constants for events and messages ---
const CAN_MAKE_PAYMENT_EVENT = 'canmakepayment';
const PAYMENT_REQUEST_EVENT = 'paymentrequest';
const MESSAGE_EVENT = 'message';

const MSG_PING = 'ping';
const MSG_APP_WINDOW_READY = 'payment_app_window_ready';
const MSG_UPDATE_FOR_MERCHANT = 'update_for_merchant';

/**
 * A utility class to resolve/reject a Promise from outside its constructor.
 * This is useful for bridging event-driven APIs with Promises. In this service
 * worker, we need to resolve the paymentrequest event's promise when we receive
 * a 'message' from the payment app window.
 */
function PromiseResolver() {
  /** @private {function(T=): void} */
  this.resolve_;

  /** @private {function(*=): void} */
  this.reject_;

  /** @private {!Promise<T>} */
  this.promise_ = new Promise(function(resolve, reject) {
    this.resolve_ = resolve;
    this.reject_ = reject;
  }.bind(this));
}

PromiseResolver.prototype = {
  /** @return {!Promise<T>} */
  get promise() {
    return this.promise_;
  },

  /** @return {function(T=): void} */
  get resolve() {
    return this.resolve_;
  },

  /** @return {function(*=): void} */
  get reject() {
    return this.reject_;
  },
};

// --- Global state for the current payment flow ---
// We can only handle one payment request at a time.
let currentPayment = {
  paymentRequestEvent: null,
  resolver: null,
};

self.addEventListener(CAN_MAKE_PAYMENT_EVENT, (e) => {
  e.respondWith(true);
});

self.addEventListener(PAYMENT_REQUEST_EVENT, async (e) => {
  // Stash the event and a resolver for later.
  currentPayment.paymentRequestEvent = e;
  currentPayment.resolver = new PromiseResolver();
  e.respondWith(currentPayment.resolver.promise);

  let url = 'https://bobbucks.dev/pay';
  // The methodData here represents what the merchant supports. We could have a
  // payment selection screen, but for this simple demo if we see alipay in the list
  // we send the user through the alipay flow.
  if (e.methodData[0].supportedMethods[0].indexOf('alipay') !== -1) {
    url += '/alipay.html';
  }

  try {
    const windowClient = await e.openWindow(url);
    if (windowClient === null) {
      currentPayment.resolver.reject('Failed to open window');
    }
  } catch (err) {
    currentPayment.resolver.reject(err);
  }
});

self.addEventListener(MESSAGE_EVENT, (e) => {
  // A message could be received before a payment request is initiated.
  if (!currentPayment.resolver) {
    return;
  }

  switch (e.data) {
    case MSG_PING:
      // Keep-alive message from the payment app window.
      return;
    case MSG_APP_WINDOW_READY:
      sendPaymentRequestToClient();
      return;
    case MSG_UPDATE_FOR_MERCHANT:
      sendUpdateToMerchant();
      return;
  }

  if (e.data.methodName) {
    currentPayment.resolver.resolve(e.data);
  } else {
    currentPayment.resolver.reject(e.data);
  }
});

async function postMessageToClient(msg) {
  // Note that the returned window_client from openWindow is not used since
  // it might be changed by refreshing the opened page.
  // Refer to https://www.w3.org/TR/service-workers-1/#clients-getall
  const options = {
    includeUncontrolled: false,
    type: 'window',
  };
  const clientList = await clients.matchAll(options);
  for (const client of clientList) {
    // Might do more communications or checks to make sure the message is
    // posted to the correct window only.
    client.postMessage(msg);
  }
}

function sendPaymentRequestToClient() {
  if (!currentPayment.paymentRequestEvent) return;
  // Copy the relevant data from the paymentRequestEvent to
  // send to the payment app confirmation page.
  // Note that the entire PaymentRequestEvent can not be passed through
  // postMessage directly since it can not be cloned.
  postMessageToClient({
    total: currentPayment.paymentRequestEvent.total,
    methodData: currentPayment.paymentRequestEvent.methodData,
  });
}

async function sendUpdateToMerchant() {
  if (!currentPayment.paymentRequestEvent) return;
  // TODO(smcgruer): Implement properly, this is just testing communication.
  const response = await currentPayment.paymentRequestEvent.changePaymentMethod('https://bobbucks.dev/pay');
  postMessageToClient({
    updateWith: response.error,
  });
}

