(function () {
  const articleEl = document.getElementById('reader-article');
  const tocEl = document.getElementById('reader-toc');
  const digestEl = document.getElementById('reader-digest');
  const chapterNum = Number(document.body.dataset.chapter || 0);

  const FONT_KEY = 'thesis_reader_font_px';
  const DEFAULT_FONT = 20;
  const MIN_FONT = 16;
  const MAX_FONT = 28;

  const chapterTitles = {
    0: 'Acknowledgments',
    1: 'General Introduction, Outline and Glossary',
    2: 'Use of artificial intelligence chatbots for cancer treatment information',
    3: 'The effect of using a large language model to respond to patient messages',
    4: 'NLP extraction of esophagitis severity in radiotherapy notes',
    5: 'Large language models for social determinants of health extraction',
    6: 'Agentic AI for immunotherapy toxicity detection',
    7: 'Evaluation of ChatGPT family for biomedical reasoning and classification',
    8: 'Cross-care: pre-training data and healthcare bias',
    9: 'Fragility to drug names in biomedical benchmarks',
    10: 'Helpfulness backfires: sycophancy and false medical information',
    11: 'WorldMedQA-V multilingual multimodal medical evaluation',
    12: 'MedBrowseComp: medical deep research and computer use',
    13: 'General Discussion and Future Perspectives',
    14: 'Appendices'
  };

  const SPECIAL_CHAPTERS = new Set([0, 14]);
  const TOTAL_CHAPTERS = 14;
  let keyboardReady = false;

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

  function setPageTitle() {
    const title = chapterTitles[chapterNum] || 'Thesis Chapter';
    const h = document.getElementById('chapter-page-title');
    if (h) h.textContent = SPECIAL_CHAPTERS.has(chapterNum) ? title : `Chapter ${chapterNum}: ${title}`;
    const p = document.getElementById('chapter-page-subtitle');
    if (p) p.textContent = SPECIAL_CHAPTERS.has(chapterNum)
      ? ''
      : 'Standalone chapter page with cleaned formatting, figures, and citations.';
    document.title = SPECIAL_CHAPTERS.has(chapterNum)
      ? `${title} | Shan Chen Thesis`
      : `Chapter ${chapterNum} | Shan Chen Thesis`;
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

  function wrapTables(root) {
    root.querySelectorAll('table').forEach((table) => {
      table.classList.add('chapter-table');
      if (!table.parentElement || !table.parentElement.classList.contains('table-scroll')) {
        const wrap = document.createElement('div');
        wrap.className = 'table-scroll';
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
      }
    });
  }

  function buildLightbox() {
    const lb = document.createElement('div');
    lb.className = 'figure-lightbox';
    lb.id = 'figure-lightbox';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Expanded figure');
    lb.innerHTML = `
      <button type="button" class="lightbox-close" aria-label="Close figure zoom">×</button>
      <figure class="lightbox-figure">
        <img alt="Expanded figure" class="lightbox-image" />
        <figcaption class="lightbox-caption"></figcaption>
      </figure>
    `;
    document.body.appendChild(lb);

    const closeBtn = lb.querySelector('.lightbox-close');
    const imgEl = lb.querySelector('.lightbox-image');
    const capEl = lb.querySelector('.lightbox-caption');
    let previousFocus = null;

    function trapFocus(e) {
      if (e.key !== 'Tab' || lb.hidden) return;
      const focusables = lb.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function close() {
      lb.hidden = true;
      document.body.classList.remove('lightbox-open');
      imgEl.removeAttribute('src');
      capEl.textContent = '';
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
    }

    closeBtn?.addEventListener('click', close);
    lb.addEventListener('click', (e) => {
      if (e.target === lb) close();
    });
    lb.addEventListener('keydown', trapFocus);

    return {
      open(src, caption, alt, triggerEl) {
        previousFocus = triggerEl || document.activeElement;
        imgEl.src = src;
        imgEl.alt = alt || 'Expanded figure';
        capEl.textContent = caption || '';
        lb.hidden = false;
        document.body.classList.add('lightbox-open');
        closeBtn?.focus();
      },
      close,
      isOpen: () => !lb.hidden
    };
  }

  function enableFigureLightbox(root) {
    const lightbox = buildLightbox();
    root.querySelectorAll('figure.chapter-figure img').forEach((img) => {
      const fig = img.closest('figure');
      const cap = fig?.querySelector('figcaption');
      img.classList.add('zoomable');
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Click to zoom figure');

      const open = () => lightbox.open(img.currentSrc || img.src, cap?.textContent?.trim() || '', img.alt, img);
      img.addEventListener('click', open);
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });

    return lightbox;
  }

  function initProgressBar() {
    const bar = document.getElementById('reader-progress-bar');
    if (!bar || !articleEl) return;

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) {
        bar.style.transform = 'scaleX(0)';
        return;
      }
      const ratio = Math.max(0, Math.min(1, window.scrollY / max));
      bar.style.transform = `scaleX(${ratio})`;
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  function initKeyboardShortcuts(lightbox) {
    if (keyboardReady) return;
    keyboardReady = true;

    document.addEventListener('keydown', (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (lightbox?.isOpen() && e.key === 'Escape') {
        e.preventDefault();
        lightbox.close();
        return;
      }

      const current = Number(localStorage.getItem(FONT_KEY) || DEFAULT_FONT);

      if (e.key === '[') {
        e.preventDefault();
        navigateToChapter(-1);
      } else if (e.key === ']') {
        e.preventDefault();
        navigateToChapter(1);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        applyFontSize(current - 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        applyFontSize(current + 1);
      } else if (e.key === '0') {
        e.preventDefault();
        applyFontSize(DEFAULT_FONT);
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        document.getElementById('theme-toggle')?.click();
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const first = articleEl.querySelector('figure.chapter-figure img');
        first?.click();
      } else if (e.key === 'Escape' && lightbox?.isOpen()) {
        e.preventDefault();
        lightbox.close();
      }
    });
  }

  function extractDigestSections(root) {
    if (!digestEl) return;
    const rightPanel = digestEl.closest('.reader-panel-right');

    const labels = new Set(['background', 'methods', 'method', 'findings', 'interpretation']);
    const stopLabels = new Set(['introduction', 'results', 'discussion', 'conclusion', 'conclusions', 'references']);

    const cards = [];
    const headings = Array.from(root.querySelectorAll('h1, h2, h3'));
    const introHeading = headings.find((h) => stopLabels.has(cleanText(h.textContent).toLowerCase()));

    // Find the "Summary" heading (if any).
    const summaryHeading = headings.find((h) => cleanText(h.textContent).toLowerCase() === 'summary');

    // Strategy 1: extract h2/h3 sub-sections with digest labels (e.g., Ch3, Ch6).
    if (summaryHeading) {
      const next = summaryHeading.nextElementSibling;
      if (next && /^h[23]$/i.test(next.tagName) && labels.has(cleanText(next.textContent).toLowerCase())) {
        summaryHeading.remove();
      }
    }

    const currentHeadings = Array.from(root.querySelectorAll('h2, h3'));
    currentHeadings.forEach((heading) => {
      const label = cleanText(heading.textContent).toLowerCase();
      if (!labels.has(label)) return;
      if (introHeading && (heading.compareDocumentPosition(introHeading) & Node.DOCUMENT_POSITION_PRECEDING)) {
        return;
      }

      const body = [];
      let cur = heading.nextElementSibling;
      while (cur && !/^h[1-3]$/i.test(cur.tagName)) {
        if (cur.tagName === 'P') {
          const t = cleanText(cur.textContent);
          if (t) body.push(t);
        }
        const next = cur.nextElementSibling;
        cur.remove();
        cur = next;
      }

      heading.remove();
      if (body.length) {
        cards.push({ title: heading.textContent, text: body.join(' ') });
      }
    });

    // Strategy 2: parse inline Summary paragraphs where labels are <span>Label<br/></span><span>text</span>
    if (!cards.length && summaryHeading) {
      const paras = [];
      let cur = summaryHeading.nextElementSibling;
      while (cur && !/^h[1-3]$/i.test(cur.tagName)) {
        if (cur.tagName === 'P') paras.push(cur);
        cur = cur.nextElementSibling;
      }

      paras.forEach((p) => {
        const spans = Array.from(p.querySelectorAll(':scope > span'));
        if (spans.length < 1) return;
        const firstSpan = spans[0];
        const br = firstSpan.querySelector('br');
        if (!br) return;
        const labelText = cleanText(firstSpan.textContent).toLowerCase();
        if (!labels.has(labelText)) return;

        const bodyText = spans.slice(1).map((s) => cleanText(s.textContent)).filter(Boolean).join(' ');
        if (bodyText) {
          cards.push({ title: labelText.charAt(0).toUpperCase() + labelText.slice(1), text: bodyText });
          p.remove();
        }
      });

      if (cards.length) summaryHeading.remove();
    }

    if (!cards.length) {
      digestEl.hidden = true;
      digestEl.innerHTML = '';
      if (rightPanel) rightPanel.hidden = true;
      return;
    }

    if (rightPanel) rightPanel.hidden = false;
    digestEl.hidden = false;
    digestEl.innerHTML = '';

    cards.slice(0, 5).forEach((card) => {
      const item = document.createElement('section');
      item.className = 'digest-card';

      const h = document.createElement('h3');
      h.textContent = cleanText(card.title);
      const p = document.createElement('p');
      p.textContent = card.text;

      item.appendChild(h);
      item.appendChild(p);
      digestEl.appendChild(item);
    });
  }

  function formatGlossary(root) {
    const glossaryHeading = Array.from(root.querySelectorAll('h1, h2, h3'))
      .find((h) => cleanText(h.textContent).toLowerCase() === 'glossary');
    if (!glossaryHeading) return;

    glossaryHeading.classList.add('glossary-heading');
    const glossaryList = glossaryHeading.nextElementSibling;
    if (!glossaryList || !/^(UL|OL)$/.test(glossaryList.tagName)) return;

    glossaryList.classList.add('glossary-list');
    const glossaryItems = Array.from(glossaryList.querySelectorAll(':scope > li'));
    glossaryItems.forEach((li) => {
      if (li.querySelector('.glossary-term')) return;

      let term = '';
      let definition = '';

      // Strategy 1: spans where first span contains term + <br/>, rest are definition
      const spans = Array.from(li.querySelectorAll(':scope > span'));
      if (spans.length >= 2) {
        const firstSpan = spans[0];
        const br = firstSpan.querySelector('br');
        if (br) {
          // Term is text before <br/> inside first span
          term = cleanText(firstSpan.textContent);
          definition = spans.slice(1).map((s) => cleanText(s.textContent)).filter(Boolean).join(' ');
        }
      }

      // Strategy 2: look for direct <br> child splitting term/def
      if (!definition) {
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
        term = cleanText(termParts.join(' '));
        definition = cleanText(defParts.join(' '));
      }

      // Strategy 3: split on first ": "
      if (!definition) {
        const text = cleanText(li.textContent);
        const split = text.indexOf(': ');
        if (split > 0) {
          term = cleanText(text.slice(0, split));
          definition = cleanText(text.slice(split + 2));
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

  function looksLikeSmallHeader(text) {
    if (!text) return false;
    if (text.length > 62) return false;
    if (/[.!?;]/.test(text)) return false;
    if (/^\d+([.)]|%)/.test(text)) return false;
    if (/^(chapter|summary|background|methods?|findings|interpretation|introduction|results|discussion|references?|appendices?)$/i.test(text)) return false;
    if (/^(available here:|data availability:|code availability:)/i.test(text)) return false;

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 8) return false;

    if (/,/.test(text) && words.length > 3) return false;
    return true;
  }

  function enhanceSectionBreakers(root) {
    if (chapterNum === 14) {
      Array.from(root.querySelectorAll(':scope > p')).forEach((p) => {
        const txt = cleanText(p.textContent);
        if (!txt) return;

        if (/^Available here:/i.test(txt)) {
          p.classList.add('appendix-linkline');
        }
      });
    }

    Array.from(root.querySelectorAll(':scope > p')).forEach((p) => {
      if (p.classList.length) return;

      const txt = cleanText(p.textContent);
      if (!looksLikeSmallHeader(txt)) return;

      const prev = p.previousElementSibling;
      const next = p.nextElementSibling;
      if (!next || next.tagName !== 'P') return;
      if (cleanText(next.textContent).length < 90) return;
      if (prev && /^(H1|H2|H3)$/.test(prev.tagName)) return;

      const h = document.createElement('h3');
      h.className = 'subtab-breaker';
      h.innerHTML = p.innerHTML;
      p.replaceWith(h);
    });
  }

  function buildToc(root) {
    tocEl.innerHTML = '';
    const headings = Array.from(root.querySelectorAll('h1, h2, h3')).filter((h) => cleanText(h.textContent));
    const focused = headings.filter((h) => /^(chapter\s+\d+|part\s+[ivx]+|summary|background|methods|results|discussion|references?|conclusion|limitations|introduction|a\d+[:\s]?[A-Z])/i.test(cleanText(h.textContent)));
    const items = (focused.length >= 4 ? focused : headings).slice(0, 80);

    const frag = document.createDocumentFragment();
    items.forEach((h) => {
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      let text = cleanText(h.textContent);
      // Format appendix headings: "A1Title" → "A1. Title"
      const appMatch = text.match(/^(A\d+)([A-Z])/);
      if (appMatch) {
        text = appMatch[1] + '. ' + text.slice(appMatch[1].length);
      }
      a.textContent = text;
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
    }, { rootMargin: '-24% 0px -64% 0px', threshold: 0.1 });

    items.forEach((h) => obs.observe(h));
  }

  function applyFontSize(px) {
    const value = Math.max(MIN_FONT, Math.min(MAX_FONT, px));
    document.documentElement.style.setProperty('--tr-font-size', `${value}px`);
    localStorage.setItem(FONT_KEY, String(value));
    const display = document.getElementById('font-size-value');
    if (display) display.textContent = `${value}px`;
  }

  function initFontControls() {
    const saved = Number(localStorage.getItem(FONT_KEY));
    applyFontSize(Number.isFinite(saved) && saved ? saved : DEFAULT_FONT);

    const inc = document.getElementById('font-inc');
    const dec = document.getElementById('font-dec');
    const reset = document.getElementById('font-reset');

    inc?.addEventListener('click', () => applyFontSize(Number(localStorage.getItem(FONT_KEY) || DEFAULT_FONT) + 1));
    dec?.addEventListener('click', () => applyFontSize(Number(localStorage.getItem(FONT_KEY) || DEFAULT_FONT) - 1));
    reset?.addEventListener('click', () => applyFontSize(DEFAULT_FONT));
  }

  function chapterHref(n) {
    return `thesis-chapter-${String(n).padStart(2, '0')}.html`;
  }

  function getPrevHref() {
    return chapterNum > 0 ? chapterHref(chapterNum - 1) : null;
  }

  function getNextHref() {
    return chapterNum < TOTAL_CHAPTERS ? chapterHref(chapterNum + 1) : null;
  }

  function navigateToChapter(offset) {
    const target = chapterNum + offset;
    if (target < 0 || target > TOTAL_CHAPTERS) return;
    window.location.href = chapterHref(target);
  }

  function renderFooterNav() {
    const footer = document.getElementById('chapter-footer');
    if (!footer) return;

    const prev = getPrevHref();
    const next = getNextHref();

    footer.innerHTML = '';

    const left = document.createElement('a');
    left.className = 'chapter-nav-link';
    left.href = prev || 'thesis.html';
    left.textContent = prev ? 'Previous Chapter' : 'Thesis Index';

    const center = document.createElement('a');
    center.className = 'chapter-nav-link center';
    center.href = 'thesis.html';
    center.textContent = 'All Chapters';

    const right = document.createElement('a');
    right.className = 'chapter-nav-link';
    right.href = next || 'thesis.html';
    right.textContent = next ? 'Next Chapter' : 'Thesis Index';

    footer.appendChild(left);
    footer.appendChild(center);
    footer.appendChild(right);
  }

  function formatReferences(root) {
    const headings = Array.from(root.querySelectorAll('h2'));
    const refHeading = headings.find((h) => /^references?$/i.test(cleanText(h.textContent)));
    if (!refHeading) return;

    // Wrap the references heading and all following paragraphs in a container
    const section = document.createElement('div');
    section.className = 'references-section';
    refHeading.parentNode.insertBefore(section, refHeading);
    section.appendChild(refHeading);

    // Move all subsequent p elements into the section
    let cur = section.nextElementSibling;
    while (cur) {
      const next = cur.nextElementSibling;
      if (/^(H1|H2)$/.test(cur.tagName)) break;
      if (cur.tagName === 'P') {
        cur.classList.add('ref-entry');
        section.appendChild(cur);
      } else {
        section.appendChild(cur);
      }
      cur = next;
    }
  }

  function formatAuthorLine(root) {
    // The author line is the first <p> right after the <hr> that follows chapter-subtitle
    const subtitle = root.querySelector('.chapter-subtitle');
    if (!subtitle) return;
    const hr = subtitle.nextElementSibling;
    if (!hr || hr.tagName !== 'HR') return;
    const authorP = hr.nextElementSibling;
    if (!authorP || authorP.tagName !== 'P') return;
    if (authorP.classList.contains('chapter-meta')) return;
    authorP.classList.add('author-line');
    // If there's a second paragraph that's also authors (before chapter-meta)
    const next = authorP.nextElementSibling;
    if (next && next.tagName === 'P' && !next.classList.contains('chapter-meta')) {
      const nextAfter = next.nextElementSibling;
      if (nextAfter && nextAfter.classList.contains('chapter-meta')) {
        // Merge into author line
        authorP.innerHTML += ', ' + next.innerHTML;
        next.remove();
      }
    }
  }

  function suppressSupplementCaptions(root) {
    // Remove ALL captions from appendix/supplement figures
    root.querySelectorAll('figure.chapter-figure figcaption').forEach((cap) => {
      cap.remove();
    });
    // Also remove the ::before "Caption" label by removing the figure wrapper if empty
    root.querySelectorAll('figure.chapter-figure').forEach((fig) => {
      const img = fig.querySelector('img');
      if (img) img.classList.remove('zoomable');
    });
  }

  async function loadChapter() {
    setPageTitle();
    initFontControls();

    try {
      const file = `thesis-chapters/chapter-${String(chapterNum).padStart(2, '0')}-content.html`;
      const res = await fetch(file, { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));
      const html = await res.text();
      articleEl.innerHTML = html;

      articleEl.querySelectorAll('img').forEach((img) => {
        img.loading = 'lazy';
        img.decoding = 'async';
        if (!img.alt) img.alt = `Chapter ${chapterNum} figure`;
      });

      tuneImages(articleEl);
      wrapTables(articleEl);
      extractDigestSections(articleEl);
      formatGlossary(articleEl);
      formatAuthorLine(articleEl);
      enhanceSectionBreakers(articleEl);
      formatReferences(articleEl);
      if (SPECIAL_CHAPTERS.has(chapterNum)) suppressSupplementCaptions(articleEl);
      ensureHeadingIds(articleEl);
      normalizeExternalLinks(articleEl);
      buildToc(articleEl);
      renderFooterNav();
      initProgressBar();
      const lightbox = enableFigureLightbox(articleEl);
      initKeyboardShortcuts(lightbox);
    } catch (err) {
      articleEl.innerHTML = '<p>Could not load this chapter content.</p>';
      tocEl.innerHTML = '<p>No sections</p>';
      if (digestEl) {
        digestEl.hidden = true;
        digestEl.innerHTML = '';
      }
      renderFooterNav();
      initProgressBar();
      initKeyboardShortcuts(null);
    }
  }

  loadChapter();
})();
