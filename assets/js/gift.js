/* Gift section: copy number + open Bit / PayBox safely. */
(function () {
  "use strict";
  const NUMBER = "\u2066054-481-0664\u2069";
  const DIGITS = "0544810664";
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isMobile = isAndroid || isIOS;

  // Official sources:
  //  Bit  – Bank Hapoalim's own share page (static.bankhapoalim.co.il/app/share-info) uses
  //         iOS "paymentsBIT://" and Android intent scheme=bit, package com.bnhp.payments.paymentsapp.
  //  PayBox – links.payboxapp.com is PayBox's verified Universal/App Link domain (Branch):
  //         opens the app if installed, otherwise redirects to the App Store / Play Store.
  const BIT_IOS_STORE = "https://apps.apple.com/il/app/id1182007739";
  const BIT_PLAY = "https://play.google.com/store/apps/details?id=com.bnhp.payments.paymentsapp";
  const BIT_ANDROID = "intent://#Intent;scheme=bit;package=com.bnhp.payments.paymentsapp;S.browser_fallback_url=" +
    encodeURIComponent(BIT_PLAY) + ";end";
  const PAYBOX_LINK = "https://links.payboxapp.com/";

  const toast = document.getElementById("gift-toast");
  const copyBtn = document.getElementById("gift-copy");
  const bitBtn = document.getElementById("gift-bit");
  const pbBtn = document.getElementById("gift-paybox");
  let toastTimer = 0;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 2600);
  }

  // Synchronous copy (works inside the tap even if navigation follows), plus async API.
  function copyNumber() {
    let ok = false;
    try {
      const ta = document.createElement("textarea");
      ta.value = DIGITS;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      ok = document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (e) {}
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(DIGITS).catch(function () {});
        ok = true;
      }
    } catch (e) {}
    return ok;
  }

  function sparkle(el) {
    if (!window.InviteFX || !el) return;
    const r = el.getBoundingClientRect();
    window.InviteFX.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 34, power: 0.45 });
  }

  function onCopyTap() {
    const ok = copyNumber();
    showToast(ok ? "המספר הועתק: " + NUMBER : "המספר: " + NUMBER);
    sparkle(copyBtn);
    copyBtn.classList.add("is-copied");
    setTimeout(function () { copyBtn.classList.remove("is-copied"); }, 1400);
  }
  if (copyBtn) copyBtn.addEventListener("click", onCopyTap);

  // Bit
  if (bitBtn) {
    if (isAndroid) bitBtn.href = BIT_ANDROID;
    else if (isIOS) bitBtn.href = BIT_IOS_STORE; // real link stays the safe fallback
    else { bitBtn.removeAttribute("href"); bitBtn.setAttribute("role", "button"); bitBtn.tabIndex = 0; }

    bitBtn.addEventListener("click", function (e) {
      const ok = copyNumber();
      sparkle(bitBtn);
      if (!isMobile) {
        e.preventDefault();
        showToast((ok ? "המספר הועתק: " : "המספר: ") + NUMBER + " · פתחו את ביט בטלפון");
        return;
      }
      showToast((ok ? "המספר הועתק: " : "המספר: ") + NUMBER);
      if (isIOS) {
        // Try the app scheme; if the page is still visible shortly after, go to the App Store.
        e.preventDefault();
        let left = false;
        const mark = function () { left = true; };
        document.addEventListener("visibilitychange", mark, { once: true });
        window.addEventListener("pagehide", mark, { once: true });
        window.addEventListener("blur", mark, { once: true });
        setTimeout(function () { window.location.href = "paymentsBIT://"; }, 250);
        setTimeout(function () {
          if (!left && !document.hidden) window.location.href = BIT_IOS_STORE;
        }, 1900);
      }
      // Android: native navigation to the intent URL (Chrome falls back to Play Store if missing).
    });
  }

  // PayBox: native link navigation (Universal Link / App Link must be a real user tap).
  if (pbBtn) {
    if (!isMobile) { pbBtn.removeAttribute("href"); pbBtn.setAttribute("role", "button"); pbBtn.tabIndex = 0; }
    pbBtn.addEventListener("click", function (e) {
      const ok = copyNumber();
      sparkle(pbBtn);
      if (!isMobile) {
        e.preventDefault();
        showToast((ok ? "המספר הועתק: " : "המספר: ") + NUMBER + " · פתחו את פייבוקס בטלפון");
        return;
      }
      showToast((ok ? "המספר הועתק: " : "המספר: ") + NUMBER);
      pbBtn.href = PAYBOX_LINK;
    });
  }
})();
