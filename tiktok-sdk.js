// tiktok-sdk.js — TikTok Mini Games Integration v2
// Wraps TTMinis.game SDK calls with safe fallbacks for non-TikTok environments
const TT = (() => {
  const CLIENT_KEY = 'aw03b1s28ro7gz75';
  let initialized = false;
  let loggedIn = false;
  let userCode = null;
  let userOpenId = null;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function hasSdk(){ return typeof TTMinis !== 'undefined' && TTMinis.game; }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    if (!hasSdk()) {
      console.log('[TT] Not running in TikTok — skipping SDK init.');
      return false;
    }
    try {
      // SDK should already be initialized in <head>, but call again to be safe
      TTMinis.game.init({ clientKey: CLIENT_KEY });
      initialized = true;
      console.log('[TT] SDK initialized.');
      return true;
    } catch (e) {
      console.warn('[TT] SDK init failed:', e);
      return false;
    }
  }

  // ── Loading progress ──────────────────────────────────────────────────────

  function setLoadingProgress(progress) {
    if (!initialized) return;
    try {
      TTMinis.game.setLoadingProgress({
        progress: Math.min(1, Math.max(0, progress)),
        success: () => {},
        fail: () => {},
      });
    } catch (e) {}
  }

  // ── Auth (Silent Login — REQUIRED) ────────────────────────────────────────

  function login(callback) {
    if (!initialized) { if(callback) callback(null); return; }
    try {
      TTMinis.game.login({
        success: (result) => {
          userCode = result.code;
          loggedIn = true;
          console.log('[TT] Login successful.');
          if(callback) callback(result.code);
        },
        fail: (error) => {
          console.warn('[TT] Login failed:', error);
          if(callback) callback(null);
        },
        complete: () => {},
      });
    } catch (e) {
      console.warn('[TT] Login exception:', e);
      if(callback) callback(null);
    }
  }

  // ── Shortcuts (REQUIRED) ──────────────────────────────────────────────────

  function addShortcut() {
    if (!initialized) return;
    try {
      TTMinis.game.addShortcut({
        success: () => {
          console.log('[TT] Shortcut added.');
          checkShortcutReward();
        },
        fail: (e) => console.warn('[TT] Shortcut add failed:', e),
        complete: () => {},
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
        complete: () => {},
      });
    } catch (e) {}
  }

  // ── Entrance Mission (REQUIRED) ───────────────────────────────────────────

  function startEntranceMission() {
    if (!initialized) return;
    try {
      const canUse = TTMinis.game.canIUse && TTMinis.game.canIUse('startEntranceMission');
      if (canUse) {
        TTMinis.game.startEntranceMission({
          success: () => { console.log('[TT] Entrance mission started.'); },
          fail: () => {},
          complete: () => {},
        });
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
        complete: () => {},
      });
    } catch (e) {}
  }

  // ── Rewarded Ads (REQUIRED) ───────────────────────────────────────────────

  function showRewardedAd(onReward, onFail) {
    if (!initialized) { if (onFail) onFail(); return; }
    try {
      const ad = TTMinis.game.createRewardedVideoAd({ adUnitId: '' });
      ad.onClose((res) => {
        if (res && res.isEnded) { if (onReward) onReward(); }
        else                    { if (onFail)  onFail();   }
      });
      ad.load()
        .then(() => ad.show())
        .catch((e) => { console.warn('[TT] Ad show failed:', e); if (onFail) onFail(); });
    } catch (e) {
      console.warn('[TT] showRewardedAd exception:', e);
      if (onFail) onFail();
    }
  }

  // ── Share (Social Viral) ──────────────────────────────────────────────────

  function shareGame(title, imageUrl) {
    if (!initialized) return;
    try {
      const canShare = TTMinis.game.canIUse && TTMinis.game.canIUse('shareAppMessage');
      if (canShare) {
        TTMinis.game.shareAppMessage({
          title: title || 'Can you beat me in Croc Clash? 🐊',
          imageUrl: imageUrl || '',
          success: () => { console.log('[TT] Shared successfully.'); },
          fail: () => {},
          complete: () => {},
        });
      }
    } catch (e) {}
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  function isInTikTok() { return initialized; }
  function isLoggedIn() { return loggedIn; }
  function getUserCode() { return userCode; }

  return {
    init, login, addShortcut, startEntranceMission, checkEntranceReward,
    showRewardedAd, shareGame, setLoadingProgress, isInTikTok, isLoggedIn, getUserCode,
  };
})();
