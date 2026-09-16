(function () {
  // Pegar acá la URL del Google Sheet publicado como CSV (ver README-novedades.md).
  // Ejemplo: "https://docs.google.com/spreadsheets/d/e/XXXXXXXX/pub?output=csv"
  var CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvEO4DcJuPqjecyZQkJHe3c_bPUxb4auenSm3Z8RJ2a5HuKhzX-ObitVJkEhWjAlT5b8QcmC4binmt/pub?gid=531502323&single=true&output=csv";

  var container = document.getElementById('novedades-list');
  if (!container) return;

  var searchInput = document.getElementById('novedades-search');
  var allItems = []; // se completa una vez que llega el CSV; el buscador filtra sobre esto.

  if (!CSV_URL) {
    container.innerHTML = '<p class="novedades-empty">Próximamente.</p>';
    return;
  }

  fetch(CSV_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('No se pudo cargar el feed de novedades');
      return res.text();
    })
    .then(function (csvText) {
      var rows = parseCSV(csvText);
      if (rows.length < 2) {
        container.innerHTML = '<p class="novedades-empty">Todavía no hay novedades publicadas.</p>';
        return;
      }

      var headers = rows[0].map(normalizeHeader);
      var items = rows.slice(1)
        .map(function (row) {
          var item = {};
          headers.forEach(function (h, i) { item[h] = (row[i] || '').trim(); });
          return item;
        })
        .filter(function (item) { return item.titulo || item.texto; });

      items.sort(function (a, b) { return parseDate(b.fecha) - parseDate(a.fecha); });

      if (!items.length) {
        container.innerHTML = '<p class="novedades-empty">Todavía no hay novedades publicadas.</p>';
        return;
      }

      assignIds(items);
      allItems = items;
      renderList(allItems);
      goToSharedItem();

      if (searchInput) {
        searchInput.disabled = false;
        searchInput.addEventListener('input', function () {
          applySearch(searchInput.value);
        });
      }
    })
    .catch(function (err) {
      console.error(err);
      container.innerHTML = '<p class="novedades-empty">No se pudieron cargar las novedades en este momento.</p>';
    });

  // Copiar link de una novedad puntual: un solo listener en el contenedor,
  // así sigue andando después de que el buscador vuelve a pintar la lista.
  container.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.novedad-share') : null;
    if (!btn) return;
    var url = window.location.href.split('#')[0] + '#' + btn.getAttribute('data-id');
    copyToClipboard(url, btn);
  });

  // Filtra allItems por palabra clave (busca en título, texto y categoría) y
  // vuelve a pintar la lista.
  function applySearch(query) {
    var q = normalizeText(query);
    if (!q) {
      renderList(allItems);
      return;
    }
    var filtered = allItems.filter(function (item) {
      var haystack = normalizeText(item.titulo) + ' ' + normalizeText(item.texto) + ' ' + normalizeText(item.categoria);
      return haystack.indexOf(q) !== -1;
    });
    renderList(filtered, query);
  }

  function renderList(items, query) {
    if (!items.length) {
      container.innerHTML = query
        ? '<p class="novedades-empty">No encontramos novedades para "' + escapeHTML(query) + '".</p>'
        : '<p class="novedades-empty">Todavía no hay novedades publicadas.</p>';
      return;
    }
    container.innerHTML = items.map(renderItem).join('');
  }

  // ---- helpers ----

  // Genera un slug legible a partir del título + fecha (ej: "nuevo-regimen-2026-09-02")
  // para poder linkear a una novedad puntual. Se recalcula solo, no depende de
  // ninguna columna nueva en el Sheet. Si dos quedan iguales (mismo título y
  // fecha), se numeran para no pisarse.
  function assignIds(items) {
    var seen = {};
    items.forEach(function (item) {
      var slug = slugify(item.titulo).slice(0, 60) || 'novedad';
      var t = parseDate(item.fecha);
      if (t) {
        var d = new Date(t);
        slug += '-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
      }
      var id = slug;
      var n = 2;
      while (seen[id]) { id = slug + '-' + n; n++; }
      seen[id] = true;
      item.id = id;
    });
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function slugify(str) {
    str = (str || '').toLowerCase().trim();
    str = str.normalize ? str.normalize('NFD').replace(/[̀-ͯ]/g, '') : str;
    return str.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // Si la URL trae #id-de-una-novedad (por un link compartido), hace scroll
  // hasta ella y la resalta un instante para que se note cuál es.
  function goToSharedItem() {
    var id = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('is-shared');
    setTimeout(function () { el.classList.remove('is-shared'); }, 2200);
  }

  // Copia `text` al portapapeles y muestra un "¡Copiado!" momentáneo en el botón.
  function copyToClipboard(text, btn) {
    var done = function () {
      var original = btn.getAttribute('data-label') || btn.textContent.trim();
      btn.setAttribute('data-label', original);
      btn.classList.add('is-copied');
      btn.querySelector('.label').textContent = '¡Copiado!';
      setTimeout(function () {
        btn.classList.remove('is-copied');
        btn.querySelector('.label').textContent = original;
      }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { legacyCopy(text, done); });
    } else {
      legacyCopy(text, done);
    }
  }

  function legacyCopy(text, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (e) {
      window.prompt('Copiá el link:', text);
    }
  }

  // Minúsculas y sin acentos, para comparar texto de forma laxa (usado por el buscador).
  function normalizeText(str) {
    str = (str || '').toLowerCase().trim();
    return str.normalize ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : str;
  }

  function normalizeHeader(h) {
    h = (h || '').toLowerCase().trim();
    h = h.normalize ? h.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : h;
    if (h.indexOf('titulo') !== -1) return 'titulo';
    if (h.indexOf('fecha') !== -1) return 'fecha';
    if (h.indexOf('texto') !== -1 || h.indexOf('contenido') !== -1 || h.indexOf('descripcion') !== -1) return 'texto';
    if (h.indexOf('link') !== -1 || h.indexOf('enlace') !== -1) return 'link';
    if (h.indexOf('imagen') !== -1 || h.indexOf('foto') !== -1) return 'imagen';
    if (h.indexOf('categoria') !== -1 || h.indexOf('tag') !== -1 || h.indexOf('etiqueta') !== -1 || h.indexOf('clasificacion') !== -1 || h.indexOf('tipo de novedad') !== -1) return 'categoria';
    return h;
  }

  // Clasifica el texto libre de la categoría (tal como viene del desplegable del
  // formulario) en una de las variantes de color conocidas. Si no matchea ninguna,
  // se muestra igual pero sin color propio (variante "otras").
  function categorySlug(text) {
    var t = (text || '').toLowerCase().trim();
    t = t.normalize ? t.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : t;
    if (t.indexOf('laboral') !== -1) return 'laborales';
    if (t.indexOf('salarial') !== -1) return 'salariales';
    if (t.indexOf('imposit') !== -1) return 'impositivas';
    return 'otras';
  }

  function parseDate(str) {
    if (!str) return 0;
    str = str.trim();

    // ISO / AAAA-MM-DD (o AAAA/MM/DD): sin ambigüedad, se resuelve directo.
    var iso = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (iso) {
      var dIso = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      if (!isNaN(dIso.getTime())) return dIso.getTime();
    }

    // DD/MM/AAAA o DD-MM-AAAA: formato que usa Google Sheets con locale Argentina.
    // Ojo: no usar `new Date(str)` para este caso, porque JS lo interpreta como
    // MM/DD/AAAA (formato US) y da fechas incorrectas cuando el día es <= 12.
    var dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmy) {
      var day = parseInt(dmy[1], 10);
      var month = parseInt(dmy[2], 10);
      var year = parseInt(dmy[3], 10);
      if (year < 100) year += 2000;
      var dDmy = new Date(year, month - 1, day);
      if (!isNaN(dDmy.getTime())) return dDmy.getTime();
    }

    // Último recurso: dejar que el motor de JS lo intente (por ejemplo, timestamps
    // tipo "2026-09-01T10:00:00" o "1 Sep 2026").
    var d = new Date(str);
    if (!isNaN(d.getTime())) return d.getTime();

    return 0;
  }

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function formatDate(str) {
    var t = parseDate(str);
    if (!t) return str || '';
    var d = new Date(t);
    return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  }

  function escapeHTML(str) {
    return (str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Negrita/itálica con la misma sintaxis que WhatsApp: *negrita* y _itálica_.
  // Siempre se escapa primero, así que lo único que se inyecta son <strong>/<em>.
  function formatText(str) {
    var html = escapeHTML(str);
    html = html.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
    html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');
    return html;
  }

  // Solo permite http/https, para no exponer el sitio a esquemas raros
  // (javascript:, data:, etc.) cargados desde las respuestas del formulario.
  function sanitizeUrl(url) {
    if (!url) return '';
    try {
      var u = new URL(url, window.location.href);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
    } catch (e) {}
    return '';
  }

  // Si es un link "para ver" de Google Drive (el que da la pregunta de tipo
  // "Subir archivos" del formulario), lo convierte en una URL que sirve la
  // imagen directamente — la de Drive normal muestra una página, no la imagen.
  function driveDirectUrl(url) {
    if (!url) return url;
    var m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([-\w]{10,})/);
    return m ? 'https://drive.google.com/uc?export=view&id=' + m[1] : url;
  }

  var LINK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3"/>' +
    '<path d="M9 17H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';

  function renderItem(item) {
    var imgUrl = sanitizeUrl(driveDirectUrl(item.imagen));
    var linkUrl = sanitizeUrl(item.link);
    var img = imgUrl ? '<img src="' + escapeHTML(imgUrl) + '" alt="">' : '';
    var link = linkUrl
      ? '<a class="novedad-link" href="' + escapeHTML(linkUrl) + '" target="_blank" rel="noopener">Leer más</a>'
      : '';
    var share = '<button type="button" class="novedad-link novedad-share" data-id="' + escapeHTML(item.id) + '">' +
      LINK_ICON + '<span class="label">Copiar link</span></button>';
    var tag = item.categoria
      ? '<span class="novedad-tag tag-' + categorySlug(item.categoria) + '">' + escapeHTML(item.categoria) + '</span>'
      : '';

    return '' +
      '<div class="novedad-item" id="' + escapeHTML(item.id) + '">' +
        '<div class="novedad-date">' + escapeHTML(formatDate(item.fecha)) + tag + '</div>' +
        '<div class="novedad-body">' +
          '<h3>' + escapeHTML(item.titulo) + '</h3>' +
          img +
          '<p>' + formatText(item.texto) + '</p>' +
          '<div class="novedad-actions">' + link + share + '</div>' +
        '</div>' +
      '</div>';
  }

  // Parser CSV simple con soporte de comillas, comas y saltos de línea embebidos.
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += c;
        }
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c === '\r') { /* ignore */ }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
})();
