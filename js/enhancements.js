// enhancements.js – auxiliary scripts for mobile improvements (test folder)

// Back‑to‑top button
(function () {
  const btn = document.createElement('button');
  btn.className = 'scroll-top';
  btn.setAttribute('aria-label', 'Ir arriba');
  btn.innerHTML = '↑';
  document.body.appendChild(btn);

  // Show button after scrolling down a bit
  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      btn.style.display = 'grid';
    } else {
      btn.style.display = 'none';
    }
  };
  window.addEventListener('scroll', toggleVisibility);
  toggleVisibility();

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// Make the filters container sticky (adds class "filter-bar" if not present)
(function () {
  const filters = document.querySelector('.filters');
  if (filters && !filters.classList.contains('filter-bar')) {
    filters.classList.add('filter-bar');
  }
})();
