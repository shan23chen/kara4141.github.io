(function () {
  const articleEl = document.getElementById('blog-article');
  const tocEl = document.getElementById('blog-toc');

  if (!articleEl || !tocEl) return;

  function cleanText(v) {
    return (v || '').replace(/\s+/g, ' ').trim();
  }

  function slugify(v) {
    return cleanText(v)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 90) || 'section';
  }

  function ensureHeadingIds(root) {
    const used = new Set();
    root.querySelectorAll('h1, h2, h3').forEach((h) => {
      const base = slugify(h.textContent);
      let id = base;
      let i = 2;
      while (used.has(id)) id = `${base}-${i++}`;
      h.id = id;
      used.add(id);
    });
  }

  function normalizeExternalLinks(root) {
    root.querySelectorAll('a[href]').forEach((a) => {
      try {
        const u = new URL(a.href, window.location.href);
        if (u.origin !== window.location.origin) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
      } catch (_) {}
    });
  }

  function formatGlossary(root) {
    const headings = Array.from(root.querySelectorAll('h1, h2, h3'));
    const glossaryHeading = headings.find((h) => {
      const text = cleanText(h.textContent).toLowerCase();
      return text === 'glossary' || text.includes('glossary');
    });
    
    if (!glossaryHeading) return;

    glossaryHeading.classList.add('glossary-heading');
    glossaryHeading.id = 'glossary';
    
    // Find the glossary list (next sibling that's a list)
    let current = glossaryHeading.nextElementSibling;
    while (current && !/^(UL|OL)$/i.test(current.tagName)) {
      current = current.nextElementSibling;
    }
    
    if (!current) return;

    const glossaryList = current;
    glossaryList.classList.add('glossary-list');
    const glossaryItems = Array.from(glossaryList.querySelectorAll(':scope > li'));
    
    glossaryItems.forEach((li) => {
      if (li.querySelector('.glossary-term')) return;

      let sawBreak = false;
      const termParts = [];
      const defParts = [];
      
      Array.from(li.childNodes).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
          sawBreak = true;
          return;
        }
        const text = cleanText(node.textContent || '');
        if (!text) return;
        if (sawBreak) {
          defParts.push(text);
        } else {
          termParts.push(text);
        }
      });

      let term = cleanText(termParts.join(' '));
      let definition = cleanText(defParts.join(' '));

      if (!definition) {
        const text = cleanText(li.textContent);
        const separators = [': ', ' - ', ' – ', '—'];
        for (const sep of separators) {
          const split = text.indexOf(sep);
          if (split > 0) {
            term = cleanText(text.slice(0, split));
            definition = cleanText(text.slice(split + sep.length));
            break;
          }
        }
      }

      if (!term || !definition) return;

      li.classList.add('glossary-item');
      li.innerHTML = '';

      const termEl = document.createElement('span');
      termEl.className = 'glossary-term';
      termEl.textContent = term;

      const defEl = document.createElement('span');
      defEl.className = 'glossary-def';
      defEl.textContent = definition;

      li.appendChild(termEl);
      li.appendChild(defEl);
    });
  }

  function classifyFigureImage(img) {
    const w = img.naturalWidth || 0;
    const h = img.naturalHeight || 0;
    if (!w || !h) return;

    img.classList.remove('is-portrait', 'is-banner', 'is-small');
    if (w < 420 && h < 220) {
      img.classList.add('is-small');
      return;
    }
    if (h > w * 1.25) {
      img.classList.add('is-portrait');
      return;
    }
    if (w > h * 2.4) {
      img.classList.add('is-banner');
    }
  }

  function tuneImages(root) {
    const imgs = Array.from(root.querySelectorAll('figure.chapter-figure img'));
    imgs.forEach((img) => {
      if (img.complete) {
        classifyFigureImage(img);
      } else {
        img.addEventListener('load', () => classifyFigureImage(img), { once: true });
      }
    });
  }

  function buildToc(root) {
    tocEl.innerHTML = '';
    const headings = Array.from(root.querySelectorAll('h1, h2, h3')).filter((h) => cleanText(h.textContent));
    const major = headings.filter((h) => /^(chapter\s+\d+|part\s+[ivx]+|summary|background|methods|results|discussion|references?|conclusion|limitations|glossary|proposition|curriculum vitae|appendix)/i.test(cleanText(h.textContent)));
    const items = (major.length >= 6 ? major : headings).slice(0, 120);

    const frag = document.createDocumentFragment();
    items.forEach((h) => {
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.textContent = cleanText(h.textContent);
      if (h.tagName === 'H3') a.style.paddingLeft = '14px';
      if (h.tagName === 'H2') a.style.paddingLeft = '10px';
      a.dataset.target = h.id;
      frag.appendChild(a);
    });
    tocEl.appendChild(frag);

    const links = Array.from(tocEl.querySelectorAll('a'));
    if (!links.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((lnk) => lnk.classList.toggle('active', lnk.dataset.target === id));
      });
    }, { rootMargin: '-20% 0px -68% 0px', threshold: 0.12 });

    items.forEach((h) => obs.observe(h));
  }

  async function loadOverview() {
    try {
      const res = await fetch('thesis-chapters/chapter-01-content.html', { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));

      const html = await res.text();
      articleEl.innerHTML = html;

      articleEl.querySelectorAll('img').forEach((img) => {
        img.loading = 'lazy';
        img.decoding = 'async';
        if (!img.alt) img.alt = 'Thesis figure';
      });

      formatGlossary(articleEl);
      ensureHeadingIds(articleEl);
      normalizeExternalLinks(articleEl);
      tuneImages(articleEl);
      buildToc(articleEl);

      if (window.location.hash === '#glossary') {
        const glossaryEl = document.getElementById('glossary');
        if (glossaryEl) glossaryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (_) {
      articleEl.innerHTML = '<p>Could not load thesis overview content.</p>';
      tocEl.innerHTML = '<p>No sections</p>';
    }
  }

  loadOverview();
})();
