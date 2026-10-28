(function() {
  'use strict';

  const BOBBUCKS_METHOD_URL = 'https://bobbucks.dev/pay';
  const PING_INTERVAL_MS = 60000;
  const SW_MSG_APP_READY = 'payment_app_window_ready';
  const SW_MSG_PING = 'ping';

  // Target dimensions when expanding the window for the embedded 3D-Secure challenge.
  const DEFAULT_3DS_SIZE = { width: 720, height: 640 };
  // Pause duration (ms) after resizing back from 3DS before closing the window.
  const POST_3DS_COMPLETE_DELAY_MS = 2200;

  let paymentRequestClient = null;
  let methodData = [];
  let totalAmount = { currency: 'USD', value: '148.50' };
  let currentBrand = 'bobbucks';
  let merchantName = 'Canopy & Co.';
  let selectedInstrument = '3ds_card';

  // Stores the window size prior to the 3DS resize so we can restore it.
  let savedWindowSize = null;
  // Active MediaStream for camera authentication.
  let activeCameraStream = null;

  // --- DOM Elements ---
  const brandLogoEl = document.getElementById('brand-logo');
  const brandNameEl = document.getElementById('brand-name');
  const brandTierPillEl = document.getElementById('brand-tier-pill');
  const brandSubtitleEl = document.getElementById('brand-subtitle');
  const merchantNameDisplayEl = document.getElementById('merchant-name-display');
  const totalAmountDisplayEl = document.getElementById('total-amount-display');
  const walletBalanceTitleEl = document.getElementById('wallet-balance-title');

  const viewSelectEl = document.getElementById('view-select');
  const view3dsEl = document.getElementById('view-3ds');
  const view3dsVerifiedEl = document.getElementById('view-3ds-verified');
  const viewCameraEl = document.getElementById('view-camera');

  const card3dsEl = document.getElementById('instrument-card-3ds');
  const cardCameraEl = document.getElementById('instrument-card-camera');
  const radio3dsEl = document.getElementById('radio-3ds');
  const radioCameraEl = document.getElementById('radio-camera');
  const btnContinueEl = document.getElementById('btn-continue-payment');
  const btnContinueTextEl = document.getElementById('btn-continue-text');
  const actionCaptionTextEl = document.getElementById('action-caption-text');

  const threedsMerchantEl = document.getElementById('threeds-merchant');
  const threedsAmountEl = document.getElementById('threeds-amount');
  const threedsDateEl = document.getElementById('threeds-date');
  const otpInputEl = document.getElementById('otp-code-input');
  const btnOtpAutofillEl = document.getElementById('btn-otp-autofill');
  const btn3dsApproveEl = document.getElementById('btn-3ds-approve');
  const btn3dsBackEl = document.getElementById('btn-3ds-back');
  const verifiedProgressBarEl = document.getElementById('verified-progress-bar');

  const cameraStatusPillEl = document.getElementById('camera-status-pill');
  const cameraViewportWrapperEl = document.getElementById('camera-viewport-wrapper');
  const cameraVideoEl = document.getElementById('camera-video');
  const cameraPlaceholderEl = document.getElementById('camera-placeholder');
  const cameraPlaceholderTextEl = document.getElementById('camera-placeholder-text');
  const btnRequestCameraDialogEl = document.getElementById('btn-request-camera-dialog');
  const btnRequestCameraPopupEl = document.getElementById('btn-request-camera-popup');
  const cameraErrorBoxEl = document.getElementById('camera-error-box');
  const btnConfirmCameraPayEl = document.getElementById('btn-confirm-camera-pay');
  const btnConfirmCameraTextEl = document.getElementById('btn-confirm-camera-text');
  const btnCameraBackEl = document.getElementById('btn-camera-back');

  const btnCancelPaymentEl = document.getElementById('btn-cancel-payment');
  const windowSizeReadoutEl = document.getElementById('window-size-readout');

  // --- Helpers ---

  function showView(targetView) {
    [viewSelectEl, view3dsEl, view3dsVerifiedEl, viewCameraEl].forEach((view) => {
      if (view === targetView) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });
  }

  function formatCurrency(amountObj) {
    if (!amountObj || !amountObj.value) return '$148.50';
    const num = Number(amountObj.value);
    const currency = amountObj.currency || 'USD';
    if (!isNaN(num)) {
      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
        }).format(num);
      } catch (e) {
        return `$${num.toFixed(2)} ${currency}`;
      }
    }
    return `${amountObj.value} ${currency}`;
  }

  function updateWindowSizeReadout() {
    if (!windowSizeReadoutEl) return;
    windowSizeReadoutEl.textContent = `${window.innerWidth} \u00d7 ${window.innerHeight} px`;
  }

  function applyBrandingAndDetails() {
    const customData = (methodData && methodData[0] && methodData[0].data) || {};

    // Also allow URL query param fallback when previewing standalone in a browser tab
    const urlParams = new URLSearchParams(window.location.search);
    currentBrand = customData.brand || urlParams.get('brand') || 'bobbucks';
    merchantName = customData.merchantName || urlParams.get('merchant') || 'Canopy & Co.';

    document.body.setAttribute('data-brand', currentBrand);

    if (currentBrand === 'bigbucks') {
      document.title = 'Pay with BigBucks Wallet Pro';
      brandLogoEl.textContent = 'BB+';
      brandNameEl.textContent = 'BigBucks';
      brandTierPillEl.textContent = 'Wallet Pro';
      brandSubtitleEl.textContent = 'Expanded Checkout \u2022 Buyer Protection';
      walletBalanceTitleEl.textContent = 'BigBucks Balance ($500.00)';
    } else {
      document.title = 'Pay with BobBucks';
      brandLogoEl.textContent = 'BB';
      brandNameEl.textContent = 'BobBucks';
      brandTierPillEl.textContent = 'Express';
      brandSubtitleEl.textContent = 'Compact Digital Wallet';
      walletBalanceTitleEl.textContent = 'BobBucks Balance ($500.00)';
    }

    const formattedTotal = formatCurrency(totalAmount);
    merchantNameDisplayEl.textContent = `Paying ${merchantName}`;
    totalAmountDisplayEl.textContent = formattedTotal;
    threedsMerchantEl.textContent = merchantName;
    threedsAmountEl.textContent = `${formattedTotal} ${totalAmount.currency || 'USD'}`;
    threedsDateEl.textContent = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function updateInstrumentSelectionUI() {
    selectedInstrument = radioCameraEl.checked ? 'camera_biometric' : '3ds_card';

    if (selectedInstrument === '3ds_card') {
      card3dsEl.classList.add('selected');
      cardCameraEl.classList.remove('selected');
      btnContinueTextEl.textContent = 'Continue with Visa \u2022\u2022\u2022\u2022 4242';
      actionCaptionTextEl.textContent =
          'Next: Expands window via window.resizeTo() for 3D-Secure verification';
    } else {
      card3dsEl.classList.remove('selected');
      cardCameraEl.classList.add('selected');
      btnContinueTextEl.textContent = 'Verify with Camera & Pay';
      actionCaptionTextEl.textContent =
          'Next: Uses in-dialog camera access to confirm your identity';
    }
  }

  function completePaymentWithDetails(flowDetails) {
    stopCameraStream();

    const responsePayload = {
      methodName: BOBBUCKS_METHOD_URL,
      details: Object.assign({
        status: 'success',
        brand: currentBrand,
        brandDisplayName: currentBrand === 'bigbucks' ? 'BigBucks Wallet Pro' : 'BobBucks Express',
        amount: totalAmount.value,
        currency: totalAmount.currency || 'USD',
        timestamp: new Date().toISOString(),
      }, flowDetails),
    };

    if (paymentRequestClient) {
      paymentRequestClient.postMessage(responsePayload);
    } else if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(responsePayload);
    }
    window.close();
  }

  // --- Flow 1: Fake 3D-Secure (3DS) with Dynamic Window Resize ---

  function start3dsFlow() {
    // Save current window dimensions before expanding for 3DS.
    savedWindowSize = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const customData = (methodData && methodData[0] && methodData[0].data) || {};
    const targetWidth = (customData.threeDsSize && customData.threeDsSize.width) || DEFAULT_3DS_SIZE.width;
    const targetHeight = (customData.threeDsSize && customData.threeDsSize.height) || DEFAULT_3DS_SIZE.height;

    showView(view3dsEl);
    window.resizeTo(targetWidth, targetHeight);
  }

  function cancel3dsAndReturnToWallet() {
    if (savedWindowSize) {
      window.resizeTo(savedWindowSize.width, savedWindowSize.height);
    }
    showView(viewSelectEl);
  }

  function approve3dsChallenge() {
    const code = (otpInputEl.value || '').trim();
    if (!code) {
      otpInputEl.value = '849201';
    }

    // Restore window back to its initial dimensions before completing payment.
    const restoreWidth = savedWindowSize ? savedWindowSize.width : 400;
    const restoreHeight = savedWindowSize ? savedWindowSize.height : 480;
    window.resizeTo(restoreWidth, restoreHeight);

    verifiedProgressBarEl.classList.remove('running');
    showView(view3dsVerifiedEl);

    // Trigger progress bar animation on next frame.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        verifiedProgressBarEl.classList.add('running');
      });
    });

    setTimeout(() => {
      completePaymentWithDetails({
        flow: '3ds_card',
        flowLabel: '3D-Secure Card Verification (with dynamic window.resizeTo)',
        instrumentSummary: 'Visa Signature \u2022\u2022\u2022\u2022 4242',
        threeDSecureStatus: 'authenticated',
        bobbucks_token_id: 'tok_3ds_visa_4242_verified',
      });
    }, POST_3DS_COMPLETE_DELAY_MS);
  }

  // --- Flow 2: Camera-Based Biometric Verification ---

  function updateCameraStatusUI(state, customText) {
    cameraStatusPillEl.className = 'camera-status-pill';
    if (state === 'granted' || state === 'streaming') {
      cameraStatusPillEl.classList.add('status-granted');
      cameraStatusPillEl.textContent = customText || 'Camera Active';
      btnRequestCameraDialogEl.style.display = 'none';
      btnRequestCameraPopupEl.style.display = 'none';
    } else if (state === 'prompt') {
      cameraStatusPillEl.classList.add('status-prompt');
      cameraStatusPillEl.textContent = 'Permission Prompt Required';
      btnRequestCameraDialogEl.style.display = 'inline-block';
      btnRequestCameraPopupEl.style.display = 'inline-block';
    } else if (state === 'denied') {
      cameraStatusPillEl.classList.add('status-denied');
      cameraStatusPillEl.textContent = 'Camera Permission Denied';
      btnRequestCameraDialogEl.style.display = 'inline-block';
      btnRequestCameraPopupEl.style.display = 'inline-block';
    } else {
      cameraStatusPillEl.textContent = customText || `Camera: ${state}`;
    }
  }

  async function checkCameraPermissionState() {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: 'camera' });
        updateCameraStatusUI(status.state);
        status.onchange = () => {
          updateCameraStatusUI(status.state);
          if (status.state === 'granted' && !activeCameraStream) {
            startCameraStream();
          }
        };
      } catch (err) {
        console.warn('Camera permission query error:', err);
      }
    }
  }

  async function startCameraStream() {
    cameraErrorBoxEl.style.display = 'none';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraErrorBoxEl.textContent = 'navigator.mediaDevices.getUserMedia is not available in this browser.';
      cameraErrorBoxEl.style.display = 'block';
      return;
    }

    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      activeCameraStream = stream;
      cameraVideoEl.srcObject = stream;
      cameraVideoEl.style.display = 'block';
      cameraPlaceholderEl.style.display = 'none';
      cameraViewportWrapperEl.classList.add('streaming');
      updateCameraStatusUI('streaming', 'Camera Feed Active');
    } catch (err) {
      console.error('getUserMedia failed:', err);
      cameraVideoEl.style.display = 'none';
      cameraPlaceholderEl.style.display = 'flex';
      cameraPlaceholderTextEl.textContent = 'Camera stream not active. Grant permission below to preview.';
      cameraViewportWrapperEl.classList.remove('streaming');
      cameraErrorBoxEl.innerHTML = `<strong>Camera Error (${err.name}):</strong> ${err.message || 'Could not start video stream.'}`;
      cameraErrorBoxEl.style.display = 'block';
      await checkCameraPermissionState();
    }
  }

  function stopCameraStream() {
    if (activeCameraStream) {
      activeCameraStream.getTracks().forEach((track) => track.stop());
      activeCameraStream = null;
    }
    if (cameraVideoEl) {
      cameraVideoEl.srcObject = null;
      cameraVideoEl.style.display = 'none';
    }
    if (cameraPlaceholderEl) {
      cameraPlaceholderEl.style.display = 'flex';
    }
    if (cameraViewportWrapperEl) {
      cameraViewportWrapperEl.classList.remove('streaming');
    }
  }

  function openCameraPopupFallback() {
    const popup = window.open('/pay/camera_access.html', 'camera_access_popup', 'width=500,height=400');
    if (popup) {
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          checkCameraPermissionState();
          startCameraStream();
        }
      }, 500);
    }
  }

  function startCameraAuthFlow() {
    showView(viewCameraEl);
    checkCameraPermissionState();
    startCameraStream();
  }

  function confirmCameraBiometricPayment() {
    btnConfirmCameraPayEl.disabled = true;
    btnConfirmCameraTextEl.textContent = 'Identity Verified \u2713 Completing Payment\u2026';

    setTimeout(() => {
      completePaymentWithDetails({
        flow: 'camera_biometric',
        flowLabel: 'Camera Biometric Authentication (navigator.mediaDevices)',
        instrumentSummary: currentBrand === 'bigbucks' ? 'BigBucks Balance' : 'BobBucks Balance',
        biometricVerified: true,
        bobbucks_token_id: 'tok_camera_biometric_verified',
      });
    }, 800);
  }

  // --- Service Worker Communication & Lifecycle ---

  function handleServiceWorkerMessage(e) {
    paymentRequestClient = e.source;
    if (e.data && e.data.methodData) {
      methodData = e.data.methodData;
      if (e.data.total) {
        totalAmount = e.data.total;
      }
      applyBrandingAndDetails();
    }
  }

  function pingServiceWorkerToKeepItAlive() {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(SW_MSG_PING);
    }
  }

  function cancelPayment() {
    stopCameraStream();
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('The payment request is cancelled by user');
    }
    window.close();
  }

  function init() {
    applyBrandingAndDetails();
    updateInstrumentSelectionUI();
    updateWindowSizeReadout();

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      navigator.serviceWorker.controller.postMessage(SW_MSG_APP_READY);
      setInterval(pingServiceWorkerToKeepItAlive, PING_INTERVAL_MS);
    }

    radio3dsEl.addEventListener('change', updateInstrumentSelectionUI);
    radioCameraEl.addEventListener('change', updateInstrumentSelectionUI);

    btnContinueEl.addEventListener('click', () => {
      if (selectedInstrument === '3ds_card') {
        start3dsFlow();
      } else {
        startCameraAuthFlow();
      }
    });

    btnOtpAutofillEl.addEventListener('click', () => {
      otpInputEl.value = '849201';
    });

    btn3dsApproveEl.addEventListener('click', approve3dsChallenge);
    btn3dsBackEl.addEventListener('click', cancel3dsAndReturnToWallet);

    btnRequestCameraDialogEl.addEventListener('click', startCameraStream);
    btnRequestCameraPopupEl.addEventListener('click', openCameraPopupFallback);
    btnConfirmCameraPayEl.addEventListener('click', confirmCameraBiometricPayment);
    btnCameraBackEl.addEventListener('click', () => {
      stopCameraStream();
      showView(viewSelectEl);
    });

    btnCancelPaymentEl.addEventListener('click', cancelPayment);
    window.addEventListener('resize', updateWindowSizeReadout);
  }

  init();
})();
