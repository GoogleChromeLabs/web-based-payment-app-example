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
      // payment request client may not have been set yet if the user cancels early.
      // This is not an error, so we return silently.
      return;
    }
    if (!navigator.serviceWorker.controller) {
      console.error('Service Worker controller not found. Cannot send cancellation message.');
      return;
    }
    paymentRequestClient.postMessage('The payment request is cancelled by user');
    window.close();
  }

  function updateCameraPermissionUI(state) {
    const statusElem = document.getElementById('camera-permission-status');
    const popupLink = document.getElementById('request-camera-popup-link');
    if (!statusElem) return;

    statusElem.style.display = 'block';
    if (state === 'granted') {
      statusElem.className = 'alert alert-success';
      statusElem.innerHTML = 'Camera permission: <strong>granted</strong>';
      if (popupLink) popupLink.style.display = 'none';
    } else if (state === 'prompt') {
      statusElem.className = 'alert alert-warning';
      statusElem.innerHTML = 'Camera permission: <strong>not granted (prompt required)</strong>';
      if (popupLink) popupLink.style.display = 'inline-block';
    } else if (state === 'denied') {
      statusElem.className = 'alert alert-danger';
      statusElem.innerHTML = 'Camera permission: <strong>denied</strong>';
      if (popupLink) popupLink.style.display = 'inline-block';
    } else {
      statusElem.className = 'alert alert-info';
      statusElem.innerHTML = `Camera permission: <strong>${state}</strong>`;
    }
  }

  async function checkCameraPermission() {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' });
        updateCameraPermissionUI(permissionStatus.state);
        permissionStatus.onchange = () => {
          updateCameraPermissionUI(permissionStatus.state);
        };
      } catch (err) {
        console.error('Camera permission query failed:', err);
        updateCameraPermissionUI('unavailable');
      }
    } else {
      updateCameraPermissionUI('unsupported');
    }
  }

  async function startCamera(evt) {
    if (evt) evt.preventDefault();
    const logElem = document.getElementById('camera-log');
    const videoElem = document.getElementById('camera-video');
    logElem.style.display = 'none';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElem.srcObject = stream;
      videoElem.style.display = 'block';
      logElem.className = 'alert alert-success';
      logElem.innerHTML = 'Camera started successfully!';
      logElem.style.display = 'block';
    } catch (err) {
      console.error('getUserMedia error:', err);
      videoElem.style.display = 'none';
      logElem.className = 'alert alert-danger';
      logElem.innerHTML = `<b>Camera error (${err.name})</b>: ${err.message || 'Access failed.'}`;
      logElem.style.display = 'block';
    }
  }

  function openCameraAccessPopup(evt) {
    if (evt) evt.preventDefault();
    const popup = window.open('/pay/camera_access.html', 'camera_access_popup', 'width=500,height=400');
    if (popup) {
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          checkCameraPermission();
        }
      }, 500);
    }
  }

  function init() {
    if (!navigator.serviceWorker.controller) {
      console.error('Service Worker controller not found on init. Cannot send app ready message.');
      return;
    }

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    navigator.serviceWorker.controller.postMessage(SW_MSG_APP_READY);
    setInterval(pingServiceWorkerToKeepItAlive, PING_INTERVAL_MS);

    document.getElementById('cancel').addEventListener('click', cancel);
    document.getElementById('update-with-button').addEventListener('click', updateMerchant);
    document.getElementById('trigger-internal-error-button').addEventListener('click', triggerInternalError);

    checkCameraPermission();
    document.getElementById('start-camera-button').addEventListener('click', startCamera);
    document.getElementById('request-camera-popup-link').addEventListener('click', openCameraAccessPopup);
  }

  init();
})();
