(function() {
  'use strict';

  const BOBBUCKS_METHOD_URL = 'https://bobbucks.dev/pay';
  const PING_INTERVAL_MS = 60000;
  const SW_MSG_APP_READY = 'payment_app_window_ready';
  const SW_MSG_PING = 'ping';

  // Target dimensions when expanding the window for the embedded 3D-Secure challenge.
  const DEFAULT_3DS_SIZE = { width: 720, height: 640 };
  // Minimum dimensions for the camera authentication view so it never scrolls.
  const MIN_CAMERA_VIEW_SIZE = { width: 460, height: 560 };

  // Simulated network latency for 3D-Secure challenge loading (+0.5s) and OTP verification (+0.5s).
  const THREEDS_LOAD_LATENCY_MS = 1700;
  const THREEDS_VERIFY_LATENCY_MS = 1600;
  const THREEDS_SUCCESS_HOLD_MS = 650;

  // Camera scan duration before triggering fake "Face ID Verified" state, and hold duration before completing.
  const CAMERA_SCAN_DURATION_MS = 2600;
  const CAMERA_VERIFIED_HOLD_MS = 1700;

  let paymentRequestClient = null;
  let methodData = [];
  let totalAmount = { currency: 'USD', value: '148.50' };
  let currentBrand = 'bobbucks';
  let merchantName = 'Canopy & Co.';
  let selectedInstrument = '3ds_card';

  // Stores the window size prior to dynamic resize so we can restore it on Cancel/Back.
  let savedWindowSize = null;
  // Active MediaStream and timers for camera authentication.
  let activeCameraStream = null;
  let cameraScanTimer = null;
  let cameraCompleteTimer = null;

  // --- DOM Elements ---
  const brandLogoEl = document.getElementById('brand-logo');
  const brandNameEl = document.getElementById('brand-name');
  const brandTierPillEl = document.getElementById('brand-tier-pill');
  const brandSubtitleEl = document.getElementById('brand-subtitle');
  const merchantNameDisplayEl = document.getElementById('merchant-name-display');
  const totalAmountDisplayEl = document.getElementById('total-amount-display');
  const selectSectionTitleEl = document.getElementById('select-section-title');
  const selectSectionHintEl = document.getElementById('select-section-hint');
  const walletBalanceTitleEl = document.getElementById('wallet-balance-title');

  const viewSelectEl = document.getElementById('view-select');
  const view3dsEl = document.getElementById('view-3ds');
  const viewCameraEl = document.getElementById('view-camera');

  const card3dsEl = document.getElementById('instrument-card-3ds');
  const cardCameraEl = document.getElementById('instrument-card-camera');
  const radio3dsEl = document.getElementById('radio-3ds');
  const radioCameraEl = document.getElementById('radio-camera');
  const btnContinueEl = document.getElementById('btn-continue-payment');
  const btnContinueTextEl = document.getElementById('btn-continue-text');
  const actionCaptionTextEl = document.getElementById('action-caption-text');

  const threedsLoadingStateEl = document.getElementById('threeds-loading-state');
  const threedsSpinnerEl = document.getElementById('threeds-spinner');
  const threedsVerifiedIconEl = document.getElementById('threeds-verified-icon');
  const threedsLoadingTitleEl = document.getElementById('threeds-loading-title');
  const threedsLoadingSubtitleEl = document.getElementById('threeds-loading-subtitle');
  const threedsChallengeContentEl = document.getElementById('threeds-challenge-content');
  const threedsMerchantEl = document.getElementById('threeds-merchant');
  const threedsAmountEl = document.getElementById('threeds-amount');
  const threedsDateEl = document.getElementById('threeds-date');
  const otpInputEl = document.getElementById('otp-code-input');
  const btnOtpAutofillEl = document.getElementById('btn-otp-autofill');
  const btn3dsApproveEl = document.getElementById('btn-3ds-approve');
  const btn3dsBackEl = document.getElementById('btn-3ds-back');

  const cameraStatusPillEl = document.getElementById('camera-status-pill');
  const cameraViewportWrapperEl = document.getElementById('camera-viewport-wrapper');
  const cameraVideoEl = document.getElementById('camera-video');
  const cameraVerifiedBarEl = document.getElementById('camera-verified-bar');
  const cameraPlaceholderEl = document.getElementById('camera-placeholder');
  const cameraPlaceholderTextEl = document.getElementById('camera-placeholder-text');
  const btnRequestCameraDialogEl = document.getElementById('btn-request-camera-dialog');
  const cameraErrorBoxEl = document.getElementById('camera-error-box');
  const btnConfirmCameraPayEl = document.getElementById('btn-confirm-camera-pay');
  const btnConfirmCameraTextEl = document.getElementById('btn-confirm-camera-text');
  const btnCameraBackEl = document.getElementById('btn-camera-back');

  const btnCancelPaymentEl = document.getElementById('btn-cancel-payment');
  const windowSizeReadoutEl = document.getElementById('window-size-readout');

  // --- Helpers ---

  function showView(targetView) {
    [viewSelectEl, view3dsEl, viewCameraEl].forEach((view) => {
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
      selectSectionTitleEl.textContent = 'Select Payment Method';
      selectSectionHintEl.textContent = 'Choose verification flow';
      walletBalanceTitleEl.textContent = 'BigBucks Balance ($500.00)';
      // Default to the signature Camera Face ID option in BigBucks Pro
      radioCameraEl.checked = true;
      radio3dsEl.checked = false;
    } else {
      document.title = 'Pay with BobBucks';
      brandLogoEl.textContent = 'BB';
      brandNameEl.textContent = 'BobBucks';
      brandTierPillEl.textContent = 'Express';
      brandSubtitleEl.textContent = 'Compact One-Click Checkout';
      // Compact BobBucks only offers the 3DS card option
      radio3dsEl.checked = true;
      radioCameraEl.checked = false;
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

    updateInstrumentSelectionUI();
  }

  function updateInstrumentSelectionUI() {
    if (currentBrand !== 'bigbucks') {
      selectedInstrument = '3ds_card';
      radio3dsEl.checked = true;
    } else {
      selectedInstrument = radioCameraEl.checked ? 'camera_biometric' : '3ds_card';
    }

    if (selectedInstrument === '3ds_card') {
      card3dsEl.classList.add('selected');
      cardCameraEl.classList.remove('selected');
      btnContinueTextEl.textContent = 'Pay with Apex \u2022\u2022\u2022\u2022 4242';
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

  // --- Flow 1: Fake 3D-Secure (3DS) with Dynamic Window Resize & Simulated Latency ---

  function start3dsFlow() {
    // Save current window dimensions before expanding for 3DS (in case user cancels).
    savedWindowSize = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const customData = (methodData && methodData[0] && methodData[0].data) || {};
    const targetWidth = (customData.threeDsSize && customData.threeDsSize.width) || DEFAULT_3DS_SIZE.width;
    const targetHeight = (customData.threeDsSize && customData.threeDsSize.height) || DEFAULT_3DS_SIZE.height;

    // Show loading spinner first while resizing the window
    threedsSpinnerEl.style.display = 'block';
    threedsVerifiedIconEl.style.display = 'none';
    threedsLoadingTitleEl.textContent = 'Connecting to Acme Issuing Bank\u2026';
    threedsLoadingSubtitleEl.textContent = 'Loading 3D-Secure 2.2 verification challenge';
    threedsLoadingStateEl.style.display = 'flex';
    threedsChallengeContentEl.style.display = 'none';

    showView(view3dsEl);
    window.resizeTo(targetWidth, targetHeight);

    setTimeout(() => {
      threedsLoadingStateEl.style.display = 'none';
      threedsChallengeContentEl.style.display = '';
    }, THREEDS_LOAD_LATENCY_MS);
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

    // Show simulated bank verification spinner
    threedsSpinnerEl.style.display = 'block';
    threedsVerifiedIconEl.style.display = 'none';
    threedsLoadingTitleEl.textContent = 'Verifying security code\u2026';
    threedsLoadingSubtitleEl.textContent = 'Confirming one-time passcode with Acme Issuing Bank';
    threedsChallengeContentEl.style.display = 'none';
    threedsLoadingStateEl.style.display = 'flex';

    setTimeout(() => {
      threedsSpinnerEl.style.display = 'none';
      threedsVerifiedIconEl.style.display = 'flex';
      threedsLoadingTitleEl.textContent = '3D-Secure Verified';
      threedsLoadingSubtitleEl.textContent = 'Payment authorized \u2022 Returning to merchant\u2026';

      setTimeout(() => {
        completePaymentWithDetails({
          flow: '3ds_card',
          flowLabel: '3D-Secure Card Verification (with dynamic window.resizeTo)',
          instrumentSummary: 'Apex Card \u2022\u2022\u2022\u2022 4242',
          threeDSecureStatus: 'authenticated',
          bobbucks_token_id: 'tok_3ds_apex_4242_verified',
        });
      }, THREEDS_SUCCESS_HOLD_MS);
    }, THREEDS_VERIFY_LATENCY_MS);
  }

  // --- Flow 2: Camera-Based Biometric Verification ---

  function clearCameraTimers() {
    if (cameraScanTimer) {
      clearTimeout(cameraScanTimer);
      cameraScanTimer = null;
    }
    if (cameraCompleteTimer) {
      clearTimeout(cameraCompleteTimer);
      cameraCompleteTimer = null;
    }
  }

  function updateCameraStatusUI(state, customText) {
    cameraStatusPillEl.className = 'camera-status-pill';
    if (state === 'granted' || state === 'streaming' || state === 'verified') {
      cameraStatusPillEl.classList.add('status-granted');
      cameraStatusPillEl.textContent = customText || 'Camera Active';
      btnRequestCameraDialogEl.style.display = 'none';
    } else if (state === 'prompt') {
      cameraStatusPillEl.classList.add('status-prompt');
      cameraStatusPillEl.textContent = 'Permission Required';
      cameraPlaceholderTextEl.textContent =
          'Click below to allow camera access and verify your identity.';
      btnRequestCameraDialogEl.textContent = 'Allow Camera Access';
      btnRequestCameraDialogEl.style.display = 'inline-block';
    } else if (state === 'denied') {
      cameraStatusPillEl.classList.add('status-denied');
      cameraStatusPillEl.textContent = 'Permission Denied';
      cameraPlaceholderTextEl.textContent =
          'Camera permission was denied or dismissed. Click below to retry.';
      btnRequestCameraDialogEl.textContent = 'Retry Camera Access';
      btnRequestCameraDialogEl.style.display = 'inline-block';
    } else {
      cameraStatusPillEl.textContent = customText || `Camera: ${state}`;
      btnRequestCameraDialogEl.style.display = 'inline-block';
    }
  }

  function triggerCameraVerifiedSuccess() {
    clearCameraTimers();
    cameraViewportWrapperEl.classList.add('verified');
    cameraVerifiedBarEl.classList.remove('running');
    updateCameraStatusUI('verified', '\u2713 Face ID Verified');

    btnConfirmCameraPayEl.disabled = false;
    btnConfirmCameraTextEl.textContent = '\u2713 Identity Verified \u2014 Completing Payment\u2026';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cameraVerifiedBarEl.classList.add('running');
      });
    });

    cameraCompleteTimer = setTimeout(() => {
      completePaymentWithDetails({
        flow: 'camera_biometric',
        flowLabel: 'Camera Biometric Authentication (navigator.mediaDevices)',
        instrumentSummary: currentBrand === 'bigbucks' ? 'BigBucks Balance' : 'BobBucks Balance',
        biometricVerified: true,
        bobbucks_token_id: 'tok_camera_biometric_verified',
      });
    }, CAMERA_VERIFIED_HOLD_MS);
  }

  async function startCameraStream() {
    clearCameraTimers();
    cameraErrorBoxEl.style.display = 'none';
    cameraViewportWrapperEl.classList.remove('verified');
    cameraVerifiedBarEl.classList.remove('running');

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
      btnConfirmCameraPayEl.disabled = false;
      btnConfirmCameraTextEl.textContent = 'Scanning Face ID\u2026 (or click to verify now)';
      updateCameraStatusUI('streaming', 'Scanning Face ID\u2026');

      // Automatically transition to the fake "Face ID Verified" state after scanning for a few seconds.
      cameraScanTimer = setTimeout(() => {
        triggerCameraVerifiedSuccess();
      }, CAMERA_SCAN_DURATION_MS);
    } catch (err) {
      console.error('getUserMedia failed:', err);
      cameraVideoEl.style.display = 'none';
      cameraPlaceholderEl.style.display = 'flex';
      cameraViewportWrapperEl.classList.remove('streaming');
      btnConfirmCameraPayEl.disabled = true;
      btnConfirmCameraTextEl.textContent = 'Waiting for Camera Scan\u2026';
      updateCameraStatusUI('denied');
      cameraErrorBoxEl.innerHTML = `<strong>Camera Error (${err.name}):</strong> ${err.message || 'Could not start video stream.'}`;
      cameraErrorBoxEl.style.display = 'block';
    }
  }

  function stopCameraStream() {
    clearCameraTimers();
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
      cameraViewportWrapperEl.classList.remove('streaming', 'verified');
    }
  }

  async function startCameraAuthFlow() {
    savedWindowSize = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // If opened in a short/compact window, resize taller so the camera view & any errors fit without scrolling.
    if (window.innerHeight < MIN_CAMERA_VIEW_SIZE.height || window.innerWidth < MIN_CAMERA_VIEW_SIZE.width) {
      window.resizeTo(
        Math.max(window.innerWidth, MIN_CAMERA_VIEW_SIZE.width),
        Math.max(window.innerHeight, MIN_CAMERA_VIEW_SIZE.height)
      );
    }

    btnConfirmCameraPayEl.disabled = true;
    btnConfirmCameraTextEl.textContent = 'Waiting for Camera Scan\u2026';
    cameraErrorBoxEl.style.display = 'none';
    cameraViewportWrapperEl.classList.remove('verified');
    showView(viewCameraEl);

    // Check camera permission state first. Only auto-start the stream if already granted,
    // so we don't immediately cover the dialog with a browser permission prompt before the user clicks.
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
        if (status.state === 'granted') {
          await startCameraStream();
        }
        return;
      } catch (err) {
        console.warn('Camera permission query error:', err);
      }
    }

    // Fallback if permissions API is unavailable: wait for user click.
    updateCameraStatusUI('prompt');
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
    btnConfirmCameraPayEl.addEventListener('click', triggerCameraVerifiedSuccess);
    btnCameraBackEl.addEventListener('click', () => {
      stopCameraStream();
      if (savedWindowSize) {
        window.resizeTo(savedWindowSize.width, savedWindowSize.height);
      }
      showView(viewSelectEl);
    });

    btnCancelPaymentEl.addEventListener('click', cancelPayment);
    window.addEventListener('resize', updateWindowSizeReadout);
  }

  init();
})();
