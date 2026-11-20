/* GESTIONE DELLA BACHECA (20/11/2026, Michael: «devo avere io la possibilità di scriverli»).
   Michael scrive qui avvisi e corsi e preme «Pubblica sul sito»: lo script salva bacheca.json nel deposito di GitHub
   che ospita il sito, e il sito si aggiorna da solo in un paio di minuti.
   Per scrivere serve una chiave di GitHub (token limitato a quel solo deposito, permesso «Contents: read and write»).
   La chiave la incolla Michael una volta per dispositivo; resta nel suo browser e non è scritta in nessun file del sito.
   window.GESTIONE (utente, deposito, ramo, file) lo scrive tools/costruisci_sito.py: se utente o deposito sono vuoti,
   la pagina funziona in prova e non pubblica niente. */
(function () {
  "use strict";
  var C = window.GESTIONE || {}, CHIAVE = "bacheca-chiave";
  var dati = { avvisi: [], corsi: [] }, sha = null, sporco = false, inModifica = { avvisi: -1, corsi: -1 };

  function $(id) { return document.getElementById(id); }
  function chiave() { try { return localStorage.getItem(CHIAVE) || ""; } catch (e) { return ""; } }
  function attiva() { return !!(C.utente && C.deposito); }
  function collegato() { return attiva() && !!chiave(); }
  function api() { return "https://api.github.com/repos/" + C.utente + "/" + C.deposito + "/contents/" + C.file; }
  function intestazioni() {
    return { "Authorization": "Bearer " + chiave(), "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  }
  function daB64(b) {
    var bin = atob(String(b).replace(/\s/g, "")), u = new Uint8Array(bin.length), i;
    for (i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(u);
  }
  function aB64(s) {
    var u = new TextEncoder().encode(s), bin = "", i;
    for (i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
    return btoa(bin);
  }
  function pulisci(d) {
    return { avvisi: (d && Array.isArray(d.avvisi)) ? d.avvisi : [], corsi: (d && Array.isArray(d.corsi)) ? d.corsi : [] };
  }
  function stato(testo, tipo) {
    var s = $("stato");
    s.textContent = testo;
    s.className = "stato" + (tipo ? " " + tipo : "");
  }

  /* ---------- lettura ---------- */
  function leggiDaGithub() {
    return fetch(api() + "?ref=" + encodeURIComponent(C.ramo) + "&t=" + Date.now(), { headers: intestazioni(), cache: "no-store" })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) throw new Error("chiave");
        if (!r.ok) throw new Error("rete");
        return r.json();
      })
      .then(function (j) { sha = j.sha; return JSON.parse(daB64(j.content)); });
  }
  function carica() {
    var p = collegato() ? leggiDaGithub() : fetch("bacheca.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.json(); });
    stato("Leggo la bacheca…");
    return p.then(function (d) {
      dati = pulisci(d); sporco = false; disegna();
      stato(collegato() ? "Bacheca letta. Questo dispositivo è collegato." : (attiva() ? "Bacheca letta. Per pubblicare collega questo dispositivo, qui sotto." : "Prova: qui non si pubblica niente."));
    }).catch(function (e) {
      disegna();
      stato(e && e.message === "chiave" ? "La chiave non è valida o è scaduta. Inseriscila di nuovo qui sotto." : "Non riesco a leggere la bacheca. Controlla la connessione e ricarica la pagina.", "errore");
    });
  }

  /* ---------- elenchi ---------- */
  function riga(testo, sotto, quale, i) {
    var li = document.createElement("li"), d = document.createElement("div"), b = document.createElement("b"), s = document.createElement("span");
    var az = document.createElement("div"), m = document.createElement("button"), t = document.createElement("button");
    li.className = "riga-g";
    b.textContent = testo; s.textContent = sotto;
    d.appendChild(b); d.appendChild(s);
    az.className = "azioni";
    m.type = "button"; m.className = "tasto vuoto piccolo"; m.textContent = "Modifica";
    m.addEventListener("click", function () { modifica(quale, i); });
    t.type = "button"; t.className = "tasto vuoto piccolo"; t.textContent = "Togli";
    t.addEventListener("click", function () {
      if (t.getAttribute("data-sicuro")) { dati[quale].splice(i, 1); inModifica[quale] = -1; cambiato(); return; }
      t.setAttribute("data-sicuro", "1"); t.textContent = "Conferma";
      setTimeout(function () { t.removeAttribute("data-sicuro"); t.textContent = "Togli"; }, 4000);
    });
    az.appendChild(m); az.appendChild(t);
    li.appendChild(d); li.appendChild(az);
    return li;
  }
  function elenco(id, voci, fai) {
    var ul = $(id);
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    voci.forEach(function (v, i) { ul.appendChild(fai(v, i)); });
    $(id + "-vuoto").hidden = !!voci.length;
  }
  function giorno(g) { return window.Bacheca.dataBuona(g) ? window.Bacheca.dataIt(g) : "data mancante"; }
  function disegna() {
    elenco("g-avvisi", dati.avvisi, function (a, i) {
      return riga(a.titolo, giorno(a.data) + (a.sede ? " · " + a.sede : " · tutte e due le sedi") + (a.fino ? " · visibile fino al " + giorno(a.fino) : ""), "avvisi", i);
    });
    elenco("g-corsi", dati.corsi, function (c, i) {
      return riga(c.corso, c.sede + " · dal " + giorno(c.inizio) + " · " + (c.orario || ""), "corsi", i);
    });
    window.Bacheca.mostra(dati);
    $("pubblica").disabled = !sporco || !collegato();
    $("da-pubblicare").textContent = sporco ? (collegato() ? "Hai modifiche da pubblicare." : (attiva() ? "Per pubblicare collega questo dispositivo." : "Prova: le modifiche non si pubblicano.")) : "Nessuna modifica da pubblicare.";
    disegnaCollegamento();
  }
  function cambiato() { sporco = true; disegna(); stato(""); }

  /* ---------- moduli ---------- */
  function valore(id) { return $(id).value.replace(/\s+/g, " ").trim(); }
  function svuota(quale) {
    var f = $(quale === "avvisi" ? "form-avviso" : "form-corso");
    f.reset(); inModifica[quale] = -1;
    f.querySelector("button[type=submit]").textContent = quale === "avvisi" ? "Aggiungi l’avviso" : "Aggiungi il corso";
    f.querySelector(".annulla").hidden = true;
  }
  function modifica(quale, i) {
    var v = dati[quale][i], f = $(quale === "avvisi" ? "form-avviso" : "form-corso");
    if (quale === "avvisi") { $("a-titolo").value = v.titolo || ""; $("a-testo").value = v.testo || ""; $("a-sede").value = v.sede || ""; $("a-fino").value = v.fino || ""; }
    else { $("c-corso").value = v.corso || ""; $("c-sede").value = v.sede || "Gioia del Colle"; $("c-inizio").value = v.inizio || ""; $("c-orario").value = v.orario || ""; }
    inModifica[quale] = i;
    f.querySelector("button[type=submit]").textContent = "Salva le modifiche";
    f.querySelector(".annulla").hidden = false;
    f.closest("details").open = true;
    f.scrollIntoView({ block: "center" });
  }
  function salvaAvviso(e) {
    e.preventDefault();
    var i = inModifica.avvisi, vecchio = i >= 0 ? dati.avvisi[i] : {};
    var a = { data: vecchio.data || window.Bacheca.oggi(), titolo: valore("a-titolo"), testo: valore("a-testo"), sede: $("a-sede").value };
    if ($("a-fino").value) a.fino = $("a-fino").value;
    if (vecchio.link) { a.link = vecchio.link; a.testo_link = vecchio.testo_link; }
    if (!a.titolo || !a.testo) return;
    if (i >= 0) dati.avvisi[i] = a; else dati.avvisi.unshift(a);
    svuota("avvisi"); cambiato();
  }
  function salvaCorso(e) {
    e.preventDefault();
    var i = inModifica.corsi;
    var c = { corso: valore("c-corso"), sede: $("c-sede").value, inizio: $("c-inizio").value, orario: valore("c-orario").replace(/[.\s]+$/, "") };
    if (!c.corso || !c.inizio || !c.orario) return;
    if (i >= 0) dati.corsi[i] = c; else dati.corsi.push(c);
    svuota("corsi"); cambiato();
  }

  /* ---------- pubblicazione ---------- */
  function scrivi(riprova) {
    var corpo = { message: "Bacheca aggiornata dalla pagina di gestione", content: aB64(JSON.stringify(dati, null, 2) + "\n"), branch: C.ramo };
    if (sha) corpo.sha = sha;
    return fetch(api(), { method: "PUT", headers: intestazioni(), body: JSON.stringify(corpo) }).then(function (r) {
      if (r.status === 401 || r.status === 403) throw new Error("chiave");
      if ((r.status === 409 || r.status === 422) && riprova) {
        /* il file è cambiato da un altro dispositivo: prendo la sua impronta e riprovo una volta con i dati di questo */
        return fetch(api() + "?ref=" + encodeURIComponent(C.ramo) + "&t=" + Date.now(), { headers: intestazioni(), cache: "no-store" })
          .then(function (g) { return g.json(); }).then(function (j) { sha = j.sha; return scrivi(false); });
      }
      if (!r.ok) throw new Error("rete");
      return r.json();
    });
  }
  function pubblica() {
    if (!collegato() || !sporco) return;
    $("pubblica").disabled = true;
    stato("Pubblico…");
    scrivi(true).then(function (j) {
      sha = j && j.content && j.content.sha || sha; sporco = false; disegna();
      stato("Pubblicato. Il sito si aggiorna entro due minuti.", "bene");
    }).catch(function (e) {
      disegna();
      stato(e && e.message === "chiave" ? "La chiave non è valida o è scaduta. Inseriscila di nuovo qui sotto." : "Non pubblicato. Controlla la connessione e premi di nuovo «Pubblica sul sito».", "errore");
    });
  }

  /* ---------- collegamento ---------- */
  function disegnaCollegamento() {
    $("coll-prova").hidden = attiva();
    $("coll-chiave").hidden = !attiva() || collegato();
    $("coll-fatto").hidden = !collegato();
  }
  function salvaChiave(e) {
    e.preventDefault();
    var v = $("campo-chiave").value.trim();
    if (!v) return;
    try { localStorage.setItem(CHIAVE, v); } catch (x) { stato("Questo browser non lascia salvare la chiave. Esci dalla navigazione in incognito.", "errore"); return; }
    $("campo-chiave").value = "";
    var miei = sporco ? dati : null;
    carica().then(function () { if (miei && sha) { dati = miei; sporco = true; disegna(); } });
  }
  function scollega() {
    try { localStorage.removeItem(CHIAVE); } catch (x) {}
    sha = null; disegna(); stato("Dispositivo scollegato.");
  }

  $("form-avviso").addEventListener("submit", salvaAvviso);
  $("form-corso").addEventListener("submit", salvaCorso);
  $("form-avviso").querySelector(".annulla").addEventListener("click", function () { svuota("avvisi"); });
  $("form-corso").querySelector(".annulla").addEventListener("click", function () { svuota("corsi"); });
  $("pubblica").addEventListener("click", pubblica);
  $("form-chiave").addEventListener("submit", salvaChiave);
  $("scollega").addEventListener("click", scollega);
  window.addEventListener("beforeunload", function (e) { if (sporco && collegato()) { e.preventDefault(); e.returnValue = ""; } });
  carica();
})();
