// Online bridge: runs only in index.html (the hosted version). Offline files never load it.
// Stage 1: knows it is inside Owlbear Rodeo, shows the role, lets you switch the panel between narrow and wide.
// Later stages add here: sync between players (OBR.broadcast), token cards, music for everyone.
(function (U) {
  const ON = window.ONLINE || {}; const OBR = window.OBR || null; const T = U.T;
  const SIZES = { narrow: { w: 440, h: 760 }, wide: { w: 1180, h: 820 } };
  const getSize = () => { try { return localStorage.getItem('dnd.panel') === 'wide' ? 'wide' : 'narrow'; } catch (e) { return 'narrow'; } };
  const applySize = async s => {
    try { localStorage.setItem('dnd.panel', s); } catch (e) {}
    if (OBR) { try { await OBR.action.setWidth(SIZES[s].w); await OBR.action.setHeight(SIZES[s].h); } catch (e) { console.warn(e); } }
    document.body.classList.toggle('panel-narrow', s === 'narrow');
  };
  U.ONLINE = ON;
  U.obrNotify = (text, variant) => { if (OBR) try { OBR.notification.show(String(text).replace(/<[^>]+>/g, '').slice(0, 140), variant || 'DEFAULT'); } catch (e) {} };

  // top bar: Owlbear tag + narrow / wide button (added after the usual buttons)
  const baseTop = U.renderTop;
  U.renderTop = function () {
    baseTop();
    const el = document.getElementById('topCtl'); if (!el) return;
    const s = getSize();
    if (ON.owlbear) el.insertAdjacentHTML('beforeend', '<button class="tb" data-act="panelSize" title="' + U.esc(s === 'wide' ? T('Make the panel narrow (see the map)') : T('Make the panel wide')) + '">' + (s === 'wide' ? '⇥' : '⇤') + '</button>');
    const tag = document.getElementById('modeTag');
    if (tag && ON.owlbear && !tag.querySelector('.obrtag')) tag.insertAdjacentHTML('beforeend', ' <span class="obrtag" title="Owlbear Rodeo">🦉 ' + (ON.role === 'GM' ? T('Owlbear: DM') : T('Owlbear: player')) + '</span>');
  };
  U.ACT.panelSize = () => { applySize(getSize() === 'wide' ? 'narrow' : 'wide').then(() => U.renderTop()); };

  window.ONLINE_START = function () {
    document.body.classList.add(ON.owlbear ? 'in-obr' : 'online-direct');
    if (ON.owlbear) applySize(getSize());
    U.renderTop();
  };
})(window.UI);
