/* BACHECA DEL SITO (20/11/2026). Disegna avvisi e corsi in partenza leggendo bacheca.json, il file che Michael cambia
   dalla pagina gestione.html. Le pagine hanno già dentro gli stessi dati (scritti da tools/costruisci_sito.py): questo
   script li ridisegna e poi rilegge il file, così un avviso nuovo si vede senza ricostruire il sito.
   Il testo scritto da Michael entra sempre come testo, mai come codice. Ciò che è scaduto non si mostra. */
(function () {
  "use strict";
  var MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

  function oggi() {
    var o = new Date();
    return o.getFullYear() + "-" + ("0" + (o.getMonth() + 1)).slice(-2) + "-" + ("0" + o.getDate()).slice(-2);
  }
  function tipo(s) { return String(s == null ? "" : s).replace(/'/g, "’"); }
  function el(tag, classe, testo) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (testo != null) e.textContent = tipo(testo);
    return e;
  }
  function dataBuona(g) { return /^\d{4}-\d{2}-\d{2}$/.test(g || ""); }
  function dataIt(g) { var p = g.split("-"); return parseInt(p[2], 10) + " " + MESI[parseInt(p[1], 10) - 1] + " " + p[0]; }
  /* solo pagine del sito o indirizzi https */
  function linkBuono(h) { return /^(https:\/\/[^\s"'<>]+|[a-z0-9-]+\.html(#[a-z0-9-]+)?)$/i.test(h || ""); }
  /* un orario (18:00-19:00) non va a capo a metà */
  function conOrari(dove, testo) {
    var re = /\d{1,2}:\d{2}-\d{1,2}:\d{2}/g, i = 0, m;
    testo = tipo(testo);
    while ((m = re.exec(testo))) {
      dove.appendChild(document.createTextNode(testo.slice(i, m.index)));
      dove.appendChild(el("span", "nb", m[0]));
      i = m.index + m[0].length;
    }
    dove.appendChild(document.createTextNode(testo.slice(i)));
  }

  function avviso(a, h) {
    var li = el("li", "avviso"), q = el("p", "quando"), t = el("time", null, dataIt(a.data)), p = el("p", null, a.testo);
    t.setAttribute("datetime", a.data);
    q.appendChild(t);
    if (a.sede) q.appendChild(document.createTextNode(" · " + a.sede));
    li.appendChild(q);
    li.appendChild(el(h, null, a.titolo));
    if (linkBuono(a.link)) {
      var l = el("a", null, a.testo_link || "Apri");
      l.href = a.link;
      p.appendChild(document.createTextNode(" "));
      p.appendChild(l);
    }
    li.appendChild(p);
    return li;
  }

  function corso(c, h) {
    var li = el("li", "corso"), t = el("time", "giorno"), d = el("div"), p = el("p"), g = c.inizio.split("-");
    t.setAttribute("datetime", c.inizio);
    t.appendChild(el("b", null, String(parseInt(g[2], 10))));
    t.appendChild(el("span", null, MESI[parseInt(g[1], 10) - 1].slice(0, 3)));
    li.appendChild(t);
    d.appendChild(el(h, null, c.corso));
    conOrari(p, c.sede + " · " + String(c.orario || "").replace(/[.\s]+$/, "") + "." + (c.nota ? " " + c.nota : ""));
    d.appendChild(p);
    li.appendChild(d);
    return li;
  }

  function validi(dati) {
    var g = oggi();
    var avvisi = (dati && dati.avvisi || []).filter(function (a) { return a && a.titolo && dataBuona(a.data) && !(dataBuona(a.fino) && g > a.fino); });
    var corsi = (dati && dati.corsi || []).filter(function (c) { return c && c.corso && dataBuona(c.inizio) && !(g > (dataBuona(c.fino) ? c.fino : c.inizio)); });
    avvisi.sort(function (x, y) { return x.data < y.data ? 1 : x.data > y.data ? -1 : 0; });
    corsi.sort(function (x, y) {
      if (x.inizio !== y.inizio) return x.inizio < y.inizio ? -1 : 1;
      return (x.sede === "Gioia del Colle" ? 0 : 1) - (y.sede === "Gioia del Colle" ? 0 : 1);
    });
    return { avvisi: avvisi, corsi: corsi };
  }

  function riempi(id, voci, fai) {
    var lista = document.getElementById("lista-" + id), senza = document.getElementById("senza-" + id);
    if (!lista) return;
    var quanti = parseInt(lista.getAttribute("data-quanti") || "0", 10), h = lista.getAttribute("data-h") || "h3";
    if (quanti) voci = voci.slice(0, quanti);
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    voci.forEach(function (v) { lista.appendChild(fai(v, h)); });
    lista.hidden = !voci.length;
    if (senza) senza.hidden = !!voci.length;
  }

  function mostra(dati) {
    var v = validi(dati);
    riempi("avvisi", v.avvisi, avviso);
    riempi("corsi", v.corsi, corso);
  }

  window.Bacheca = { mostra: mostra, oggi: oggi, dataIt: dataIt, dataBuona: dataBuona };
  if (window.BACHECA_INIZIALE) mostra(window.BACHECA_INIZIALE);
  if (!window.BACHECA_FERMA && window.fetch) {
    fetch("bacheca.json?t=" + Math.floor(Date.now() / 60000), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) mostra(d); })
      .catch(function () {});
  }
})();
