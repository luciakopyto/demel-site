(function () {
  var btn = document.querySelector('.menu-btn');
  var links = document.querySelector('.nav-links');
  if (!btn || !links) return;

  function setOpen(isOpen) {
    btn.classList.toggle('is-open', isOpen);
    links.classList.toggle('is-open', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
  }

  btn.setAttribute('aria-expanded', 'false');

  btn.addEventListener('click', function () {
    setOpen(!links.classList.contains('is-open'));
  });

  // Cerrar al elegir una sección (útil sobre todo para anclas dentro de la misma página).
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setOpen(false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  // Si se agranda la ventana (o se gira el celular) y deja de ser mobile, resetear.
  window.addEventListener('resize', function () {
    if (window.innerWidth > 760) setOpen(false);
  });
})();
