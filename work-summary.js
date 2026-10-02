// Shared by the browser, server and regression tests. Never uses the device clock.
(function (root) {
  const reasons = { manual: 'Ukončeno sčítačem', inactivity: 'Nečinnost (20 minut)', 'session-ended': 'Ukončeno správcem' };
  function workSummary(session, user = {}) {
    const joined = Date.parse(user.joined);
    const finishedAt = user.finishedAt || (session.ended ? session.endedAt : null);
    const end = Date.parse(finishedAt || session.serverNow);
    const valid = Number.isFinite(joined) && Number.isFinite(end) && end >= joined;
    const rate = Number(session.hourlyRate);
    const hourlyRate = Number.isFinite(rate) && rate >= 0 ? rate : 0;
    const hours = valid ? (end - joined) / 36e5 : null;
    const finishReason = user.finishReason || (session.ended ? 'session-ended' : null);
    return { finishedAt, finishReason, confirmed: !!finishedAt && valid, hourlyRate,
      hours: hours === null ? null : Math.round(hours * 100) / 100,
      reward: hours === null ? null : Math.round(hours * hourlyRate * 100) / 100,
      reasonLabel: reasons[finishReason] || (finishedAt ? 'Neznámý způsob ukončení' : 'Probíhá') };
  }
  if (typeof module === 'object' && module.exports) module.exports = workSummary;
  else root.trafficWorkSummary = workSummary;
})(globalThis);
