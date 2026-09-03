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

      allItems = items;
      renderList(allItems);

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

  function renderItem(item) {
    var imgUrl = sanitizeUrl(item.imagen);
    var linkUrl = sanitizeUrl(item.link);
    var img = imgUrl ? '<img src="' + escapeHTML(imgUrl) + '" alt="">' : '';
    var link = linkUrl
      ? '<a class="novedad-link" href="' + escapeHTML(linkUrl) + '" target="_blank" rel="noopener">Leer más</a>'
      : '';
    var tag = item.categoria
      ? '<span class="novedad-tag tag-' + categorySlug(item.categoria) + '">' + escapeHTML(item.categoria) + '</span>'
      : '';

    return '' +
      '<div class="novedad-item">' +
        '<div class="novedad-date">' + escapeHTML(formatDate(item.fecha)) + tag + '</div>' +
        '<div class="novedad-body">' +
          '<h3>' + escapeHTML(item.titulo) + '</h3>' +
          img +
          '<p>' + escapeHTML(item.texto) + '</p>' +
          link +
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
