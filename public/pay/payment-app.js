(function() {
  'use strict';

  const BOBBUCKS_METHOD_URL = 'https://bobbucks.dev/pay';
  const PING_INTERVAL_MS = 60000;
  const SW_MSG_APP_READY = 'payment_app_window_ready';
  const SW_MSG_PING = 'ping';
  const SW_MSG_UPDATE_MERCHANT = 'update_for_merchant';

  let paymentRequestClient;
  let methodData;

  function addToInstrumentList(content, clickHandler) {
    const linkedContainer = document.createElement('a');
    linkedContainer.className = 'list-group-item';
    linkedContainer.setAttribute('href', '#');
    linkedContainer.appendChild(content);
    linkedContainer.addEventListener('click', clickHandler);
    document.getElementById('payment-instrument-list').appendChild(linkedContainer);
  }

  function populatePaymentInstrumentsList() {
    // First, remove everything from the list. We won't bother with doing anything fancier.
    const listNode = document.getElementById('payment-instrument-list');
    while (listNode.lastChild) {
      listNode.removeChild(listNode.lastChild);
    }

    if (methodData.some(method => method.supportedMethods.includes(BOBBUCKS_METHOD_URL))) {
      // This merchant supports bobbucks, offer bobbucks balance as an option
      const label = document.createElement('h4');
      label.innerHTML = 'Pay with BobBucks balance ($50.00)';
      addToInstrumentList(label, payWithBobBucksBalance);
    }
  }

  function payWithBobBucksBalance() {
    if (!paymentRequestClient) return;

    const paymentAppResponse = {
      methodName: BOBBUCKS_METHOD_URL,
      details: {
        bobbucks_token_id: 'ABCDEADBEEF',
        message: 'Thanks for using BobBucks!',
      },
    };

    paymentRequestClient.postMessage(paymentAppResponse);
    window.close();
  }

  function handleServiceWorkerMessage(e) {
    paymentRequestClient = e.source;

    if (e.data.methodData) {
      methodData = e.data.methodData;
      document.getElementById('details').innerHTML = JSON.stringify(e.data, undefined, 2);
      populatePaymentInstrumentsList();
    } else if (e.data.updateWith) {
      const log = document.getElementById('update-with-event-log');
      log.innerHTML = `<b>Received update from merchant</b>: ${e.data.updateWith}`;
      log.style.display = 'block';
    }
  }

  function pingServiceWorkerToKeepItAlive() {
    if (!navigator.serviceWorker.controller) {
      console.error('Service Worker controller not found. Cannot send ping message.');
      return;
    }
    navigator.serviceWorker.controller.postMessage(SW_MSG_PING);
  }

  function updateMerchant(evt) {
    evt.preventDefault();
    if (!navigator.serviceWorker.controller) {
      console.error('Service Worker controller not found. Cannot send update merchant message.');
      return;
    }
    navigator.serviceWorker.controller.postMessage(SW_MSG_UPDATE_MERCHANT);
  }

  function triggerInternalError(evt) {
    evt.preventDefault();
    if (!paymentRequestClient) {
      // payment request client may not have been set yet if the button is clicked early.
      // This is not an error, so we return silently.
      return;
    }
    if (!navigator.serviceWorker.controller) {
      console.error('Service Worker controller not found. Cannot send internal error message.');
      return;
    }

    // See https://github.com/w3c/web-based-payment-handler/pull/429 for the proposed
    // error type to indicate internal payment app error.
    paymentRequestClient.postMessage(new DOMException("Internal app error", "OperationError"));
    window.close();
  }

  function cancel() {
    if (!paymentRequestClient) {
      window.close();
      return;
    }
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('The payment request is cancelled by user');
    }
    window.close();
  }

  function init() {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      navigator.serviceWorker.controller.postMessage(SW_MSG_APP_READY);
      setInterval(pingServiceWorkerToKeepItAlive, PING_INTERVAL_MS);
    } else {
      console.warn('Service Worker controller not active. Running in standalone mode.');
      populatePaymentInstrumentsList();
    }

    const cancelBtn = document.getElementById('cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', cancel);

    const updateBtn = document.getElementById('update-with-button');
    if (updateBtn) updateBtn.addEventListener('click', updateMerchant);

    const errBtn = document.getElementById('trigger-internal-error-button');
    if (errBtn) errBtn.addEventListener('click', triggerInternalError);
  }

  init();
})();
