// tiktok-sdk.js — TikTok Mini Games Integration
const TT = (() => {
  const CLIENT_KEY = 'aw03b1s28ro7gz75';
  let initialized = false;
  let loggedIn = false;
  let userCode = null;

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    if (typeof TTMinis === 'undefined') {
      console.log('[TT] Not running in TikTok — skipping SDK init.');
      return false;
    }
    try {
      TTMinis.game.init({ clientKey: CLIENT_KEY });
      initialized = true;
      TTMinis.game.setLoadingProgress({ progress: 1 });
      console.log('[TT] SDK initialized.');
      return true;
    } catch (e) {
      console.warn('[TT] SDK init failed:', e);
      return false;
    }
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  function login(callback) {
    if (!initialized) { callback(null); return; }
    try {
      TTMinis.game.login({
        success: (result) => {
          userCode = result.code;
          loggedIn = true;
          console.log('[TT] Login successful.');
          callback(result.code);
        },
        fail: (error) => {
          console.warn('[TT] Login failed:', error);
          callback(null);
        },
      });
    } catch (e) {
      console.warn('[TT] Login exception:', e);
      callback(null);
    }
  }

  // ── Shortcuts ──────────────────────────────────────────────────────────────

  function addShortcut() {
    if (!initialized) return;
    try {
      TTMinis.game.addShortcut({
        success: () => { checkShortcutReward(); },
        fail:    (e) => console.warn('[TT] Shortcut add failed:', e),
      });
    } catch (e) { console.warn('[TT] addShortcut exception:', e); }
  }

  function checkShortcutReward() {
    if (!initialized) return;
    try {
      TTMinis.game.getShortcutMissionReward({
        success: ({ canReceiveReward }) => {
          if (canReceiveReward) console.log('[TT] Shortcut reward earned.');
        },
        fail: () => {},
      });
    } catch (e) { console.warn('[TT] checkShortcutReward exception:', e); }
  }

  // ── Entrance Mission ───────────────────────────────────────────────────────

  function startEntranceMission() {
    if (!initialized) return;
    try {
      const canUse = TTMinis.game.canIUse && TTMinis.game.canIUse('startEntranceMission');
      if (canUse) {
        TTMinis.game.startEntranceMission({ success: () => {}, fail: () => {} });
      }
    } catch (e) { console.warn('[TT] startEntranceMission exception:', e); }
  }

  function checkEntranceReward() {
    if (!initialized) return;
    try {
      TTMinis.game.getEntranceMissionReward({
        success: ({ canReceiveReward }) => {
          if (canReceiveReward) console.log('[TT] Entrance reward earned.');
        },
        fail: () => {},
      });
    } catch (e) { console.warn('[TT] checkEntranceReward exception:', e); }
  }

  // ── Rewarded Ads ───────────────────────────────────────────────────────────

  function showRewardedAd(onReward, onFail) {
    if (!initialized) { if (onFail) onFail(); return; }
    try {
      const ad = TTMinis.game.createRewardedVideoAd({ adUnitId: '' });
      ad.load()
        .then(() => ad.show())
        .catch((e) => { console.warn('[TT] Ad show failed:', e); if (onFail) onFail(); });
      ad.onClose((res) => {
        if (res && res.isEnded) { if (onReward) onReward(); }
        else                    { if (onFail)  onFail();   }
      });
    } catch (e) {
      console.warn('[TT] showRewardedAd exception:', e);
      if (onFail) onFail();
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  function isInTikTok() { return initialized; }
  function isLoggedIn() { return loggedIn; }
  function getUserCode() { return userCode; }

  return {
    init, login, addShortcut, startEntranceMission, checkEntranceReward,
    showRewardedAd, isInTikTok, isLoggedIn, getUserCode,
  };
})();
