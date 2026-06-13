from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import parse_qs, urlparse, unquote
import copy
import re

from bs4 import BeautifulSoup, Tag
from bs4.element import NavigableString

REPO = Path('/Users/db164/Documents/GitHub/kara4141.github.io')
SOURCE = REPO / 'thesis-content.html'
OUT_DIR = REPO / 'thesis-chapters'
OUT_DIR.mkdir(exist_ok=True)

HEADING_PATTERNS = [
    r'^chapter\s+\d+$',
    r'^part\s+[ivx]+\b.*',
    r'^summary$',
    r'^background$',
    r'^methods?$',
    r'^findings$',
    r'^interpretation$',
    r'^introduction$',
    r'^results?(?:\s*&\s*discussion)?$',
    r'^discussion$',
    r'^disscussion$',
    r'^conclusion$',
    r'^limitations?$',
    r'^references?$',
    r'^acknowledgments$',
    r'^supporting information:?$',
    r'^appendices$',
    r'^proposition:?$',
    r'^glossary$',
    r'^curriculum vitae and scientific publications$',
    r'^societal impact.*$',
]
HEADING_RE = re.compile('|'.join(f'(?:{p})' for p in HEADING_PATTERNS), re.I)
CITATION_RE = re.compile(r'^\[?\d+(?:\s*[,-–]\s*\d+)*(?:\s*,\s*\d+(?:\s*[,-–]\s*\d+)*)*\]?$', re.I)
ALL_CAPS_RE = re.compile(r'^[A-Z0-9\-\s&:]{4,}$')
FIGURE_CAP_RE = re.compile(r'^(figure|table)\s*\d+\.?', re.I)
BR_LABEL_RE = re.compile(r'^\s*([A-Za-z0-9/\-\s\(\)&]+):\s*$', re.I)
MAJOR_SECTION_SET = {
    'summary',
    'background',
    'methods',
    'method',
    'findings',
    'interpretation',
    'introduction',
    'results',
    'discussion',
    'conclusion',
    'conclusions',
    'references',
    'reference',
    'acknowledgments',
    'limitations',
    'supporting information',
}


def clean_text(text: str) -> str:
    return ' '.join((text or '').split())


def normalize_heading_text(text: str) -> str:
    t = clean_text(text)
    repl = {
        'disscussion': 'Discussion',
        'disscussions': 'Discussions',
        'reference': 'References',
        'results & disscussion': 'Results & Discussion',
        'results & disscussions': 'Results & Discussions',
    }
    key = t.lower()
    if key in repl:
        return repl[key]
    if re.fullmatch(r'[A-Z0-9\s&:/\-\.\(\)]+', t) and len(t) <= 80:
        t = t.title()
        t = (
            t.replace('Llm', 'LLM')
            .replace('Llms', 'LLMs')
            .replace('Ai', 'AI')
            .replace('Nlp', 'NLP')
            .replace('Usa', 'USA')
            .replace('Irae', 'iRAE')
        )
    return t


def parse_source() -> BeautifulSoup:
    return BeautifulSoup(SOURCE.read_text(encoding='utf-8'), 'html.parser')


def chapter_bounds(soup: BeautifulSoup, ch: int) -> tuple[Tag | None, Tag | None]:
    h1 = soup.find_all('h1')

    def find_h1(pattern: str) -> Tag | None:
        rg = re.compile(pattern, re.I)
        for node in h1:
            if rg.match(clean_text(node.get_text(' ', strip=True))):
                return node
        return None

    if ch == 1:
        top_nodes = [n for n in soup.contents if isinstance(n, Tag)]
        start = None
        for node in top_nodes:
            if re.match(r'^outline$', clean_text(node.get_text(' ', strip=True)), re.I):
                start = node
                break
        if start is None and top_nodes:
            start = top_nodes[0]
        end = find_h1(r'^chapter\s+2$')
        return start, end

    if 2 <= ch <= 11:
        return find_h1(rf'^chapter\s+{ch}$'), find_h1(rf'^chapter\s+{ch + 1}$')

    if ch == 12:
        return find_h1(r'^chapter\s+12$'), find_h1(r'^part\s+i:')

    if ch == 13:
        return find_h1(r'^part\s+i:'), find_h1(r'^curriculum vitae')

    return None, None


def extract_nodes(soup: BeautifulSoup, ch: int) -> list[Tag]:
    start, end = chapter_bounds(soup, ch)
    if start is None:
        return []

    nodes: list[Tag] = []
    cur: Tag | None = start
    while cur is not None and cur != end:
        nodes.append(copy.copy(cur))
        cur = cur.find_next_sibling()
    return nodes


def normalize_links(root: Tag) -> None:
    for a in root.find_all('a', href=True):
        href = a['href']
        if 'google.com/url?' in href:
            parsed = urlparse(href)
            q = parse_qs(parsed.query).get('q', [None])[0]
            if q:
                a['href'] = unquote(q)
        a['target'] = '_blank'
        a['rel'] = 'noopener noreferrer'


def convert_citations(root: Tag, soup: BeautifulSoup) -> None:
    for a in list(root.find_all('a', href=True)):
        text = clean_text(a.get_text(' ', strip=True))
        if not text:
            continue
        if (
            CITATION_RE.match(text)
            and '/' not in text
            and '.' not in text
            and len(text) <= 20
        ):
            a['class'] = list(dict.fromkeys([*(a.get('class', [])), 'citation-link']))
            sup = soup.new_tag('sup')
            sup['class'] = 'citation-ref'
            a.wrap(sup)


def convert_headings(root: Tag, soup: BeautifulSoup) -> None:
    for p in list(root.find_all('p')):
        if p.find('img'):
            continue
        txt = clean_text(p.get_text(' ', strip=True))
        if not txt:
            p.decompose()
            continue

        should_heading = False
        level = 'h2'

        if HEADING_RE.match(txt):
            should_heading = True
        elif ALL_CAPS_RE.match(txt) and len(txt.split()) <= 10 and len(txt) <= 90:
            should_heading = True

        if re.match(r'^chapter\s+\d+$', txt, re.I) or re.match(r'^part\s+[ivx]+\b', txt, re.I):
            level = 'h1'

        if should_heading:
            h = soup.new_tag(level)
            h.string = txt
            p.replace_with(h)


def clean_image(img: Tag) -> None:
    for attr in ('style', 'width', 'height', 'srcset', 'sizes'):
        if attr in img.attrs:
            del img[attr]
    img['loading'] = 'lazy'
    img['decoding'] = 'async'
    if not img.get('alt'):
        img['alt'] = 'Thesis figure'


def convert_figures(root: Tag, soup: BeautifulSoup) -> None:
    # Caption before image
    for p in list(root.find_all('p')):
        txt = clean_text(p.get_text(' ', strip=True))
        if not FIGURE_CAP_RE.match(txt):
            continue
        nxt = p.find_next_sibling()
        if isinstance(nxt, Tag) and nxt.name == 'p':
            img = nxt.find('img')
            if img and clean_text(nxt.get_text(' ', strip=True)) == '':
                fig = soup.new_tag('figure')
                fig['class'] = 'chapter-figure'
                clean_image(img)
                img.extract()
                fig.append(img)
                cap = soup.new_tag('figcaption')
                cap.string = txt
                fig.append(cap)
                nxt.replace_with(fig)
                p.decompose()

    # Image followed by caption
    for p in list(root.find_all('p')):
        img = p.find('img')
        if not img or clean_text(p.get_text(' ', strip=True)) != '':
            continue
        fig = soup.new_tag('figure')
        fig['class'] = 'chapter-figure'
        clean_image(img)
        img.extract()
        fig.append(img)

        nxt = p.find_next_sibling()
        if isinstance(nxt, Tag) and nxt.name == 'p':
            txt = clean_text(nxt.get_text(' ', strip=True))
            if FIGURE_CAP_RE.match(txt):
                cap = soup.new_tag('figcaption')
                cap.string = txt
                fig.append(cap)
                nxt.decompose()

        p.replace_with(fig)


def style_tables(root: Tag) -> None:
    for table in root.find_all('table'):
        classes = set(table.get('class', []))
        classes.add('chapter-table')
        table['class'] = list(classes)


def strip_inline_attributes(root: Tag) -> None:
    allowed_classes = {'chapter-figure', 'chapter-table', 'chapter-meta', 'chapter-subtitle', 'citation-ref', 'citation-link'}
    for node in root.find_all(True):
        if 'style' in node.attrs:
            del node['style']
        if node.has_attr('class'):
            raw = node.get('class', [])
            if isinstance(raw, str):
                raw_classes = [raw]
            else:
                raw_classes = list(raw)
            keep = [c for c in raw_classes if c in allowed_classes]
            if keep:
                node['class'] = keep
            else:
                del node['class']
        if node.has_attr('id') and node.name in {'h1', 'h2', 'h3', 'h4'}:
            del node['id']


def normalize_text_nodes(root: Tag) -> None:
    for node in root.descendants:
        if isinstance(node, NavigableString):
            s = str(node)
            s = s.replace('\xa0', ' ')
            s = s.replace('\u200b', '')
            s = re.sub(r'[ \t]+', ' ', s)
            if s != str(node):
                node.replace_with(s)


def build_meta_block(root: Tag, soup: BeautifulSoup) -> None:
    first_heading = root.find(['h1', 'h2'])
    if first_heading is None:
        return

    candidate: list[Tag] = []
    cur = first_heading.find_next_sibling()
    while isinstance(cur, Tag) and cur.name == 'p':
        txt = clean_text(cur.get_text(' ', strip=True))
        if not txt or len(txt) > 130 or txt.endswith('.'):
            break
        if re.match(r'^(summary|background|methods|introduction)$', txt, re.I):
            break
        candidate.append(cur)
        cur = cur.find_next_sibling()

    if len(candidate) >= 2:
        meta = soup.new_tag('div')
        meta['class'] = 'chapter-meta'
        candidate[0].insert_before(meta)
        for p in candidate:
            p.extract()
            meta.append(p)


def split_br_label_paragraphs(root: Tag, soup: BeautifulSoup) -> None:
    for p in list(root.find_all('p')):
        if not p.find('br'):
            continue
        first_text = ''
        for child in p.children:
            if isinstance(child, Tag) and child.name == 'br':
                break
            if isinstance(child, str):
                first_text += child
            elif isinstance(child, Tag):
                first_text += child.get_text(' ', strip=True)
        label = clean_text(first_text)
        if not label:
            continue

        bare = label[:-1] if label.endswith(':') else label
        is_label = bool(BR_LABEL_RE.match(label)) or bare.lower() in MAJOR_SECTION_SET
        if not is_label or len(label) > 70:
            continue

        rest = p.decode_contents()
        rest = re.sub(r'^\s*.*?<br\s*/?>', '', rest, flags=re.I | re.S)
        rest = clean_text(BeautifulSoup(rest, 'html.parser').get_text(' ', strip=True))
        if not rest:
            continue

        h = soup.new_tag('h3')
        h.string = normalize_heading_text(bare)
        new_p = soup.new_tag('p')
        new_p.string = rest
        p.replace_with(new_p)
        new_p.insert_before(h)


def remove_duplicate_chapter_title(root: Tag) -> None:
    first_h1 = root.find('h1')
    if first_h1 is None:
        return
    nxt = first_h1.find_next_sibling()
    if isinstance(nxt, Tag) and nxt.name == 'p':
        txt = clean_text(nxt.get_text(' ', strip=True))
        if re.match(r'^chapter\s+\d+$', txt, re.I):
            nxt.decompose()


def normalize_heading_hierarchy(root: Tag, soup: BeautifulSoup) -> None:
    headings = list(root.find_all(['h1', 'h2', 'h3', 'h4']))
    if not headings:
        return
    first = headings[0]
    first.name = 'h1'
    first.string = normalize_heading_text(first.get_text(' ', strip=True))

    for h in headings[1:]:
        txt = normalize_heading_text(h.get_text(' ', strip=True))
        if not txt:
            h.decompose()
            continue
        if len(txt) > 100 or 'http://' in txt.lower() or 'https://' in txt.lower() or 'www.' in txt.lower():
            p = soup.new_tag('p')
            p.string = txt
            h.replace_with(p)
            continue

        lower = txt.lower().rstrip(':')
        if lower.startswith('part '):
            h.name = 'h1'
        elif lower in MAJOR_SECTION_SET or re.match(r'^(stage|phase)\s+\d+', lower):
            h.name = 'h2'
        else:
            h.name = 'h3'
        h.string = txt


def dedupe_headings(root: Tag) -> None:
    headings = list(root.find_all(['h1', 'h2', 'h3']))
    prev_txt = None
    seen_all: set[str] = set()
    for h in headings:
        txt = clean_text(h.get_text(' ', strip=True))
        if not txt:
            h.decompose()
            continue
        norm = txt.lower().rstrip(':')
        if prev_txt == norm:
            h.decompose()
            continue
        if norm in seen_all:
            h.decompose()
            continue
        seen_all.add(norm)
        prev_txt = norm


def remove_out_of_chapter_markers(root: Tag, ch: int) -> None:
    chap_re = re.compile(r'^chapter\s+(\d+)$', re.I)
    for node in list(root.find_all(['h1', 'h2', 'h3', 'p'])):
        txt = clean_text(node.get_text(' ', strip=True))
        m = chap_re.match(txt)
        if not m:
            continue
        if int(m.group(1)) != ch:
            node.decompose()


def remove_empty_headings(root: Tag) -> None:
    for h in list(root.find_all(['h1', 'h2', 'h3', 'h4'])):
        if not clean_text(h.get_text(' ', strip=True)):
            h.decompose()


def trim_next_chapter_marker(root: Tag, ch: int) -> None:
    if ch >= 13:
        return
    target = re.compile(rf'^chapter\s+{ch + 1}$', re.I)
    for node in list(root.find_all(['h1', 'h2', 'p']))[::-1]:
        txt = clean_text(node.get_text(' ', strip=True))
        if not txt:
            node.decompose()
            continue
        if target.match(txt):
            node.decompose()
            continue
        break


def style_subtitle(root: Tag) -> None:
    first_h1 = root.find('h1')
    if first_h1 is None:
        return
    nxt = first_h1.find_next_sibling()
    if isinstance(nxt, Tag) and nxt.name == 'p':
        txt = clean_text(nxt.get_text(' ', strip=True))
        if txt and len(txt) <= 120 and not txt.endswith('.'):
            nxt['class'] = list(dict.fromkeys([*(nxt.get('class', [])), 'chapter-subtitle']))


def clean_chapter(ch: int) -> None:
    source_soup = parse_source()
    nodes = extract_nodes(source_soup, ch)
    if not nodes:
        raise RuntimeError(f'No content for chapter {ch}')

    page = BeautifulSoup('<div id="chapter-content"></div>', 'html.parser')
    root = page.find(id='chapter-content')
    for n in nodes:
        root.append(n)

    remove_duplicate_chapter_title(root)
    normalize_links(root)
    convert_headings(root, page)
    split_br_label_paragraphs(root, page)
    normalize_heading_hierarchy(root, page)
    dedupe_headings(root)
    build_meta_block(root, page)
    convert_figures(root, page)
    convert_citations(root, page)
    style_tables(root)
    remove_empty_headings(root)
    trim_next_chapter_marker(root, ch)
    remove_out_of_chapter_markers(root, ch)
    dedupe_headings(root)
    style_subtitle(root)
    strip_inline_attributes(root)
    normalize_text_nodes(root)

    for p in list(root.find_all('p')):
        if not clean_text(p.get_text(' ', strip=True)) and not p.find('img'):
            p.decompose()

    out = ''.join(str(child) for child in root.contents)
    out_path = OUT_DIR / f'chapter-{ch:02d}-content.html'
    out_path.write_text(out, encoding='utf-8')


def main() -> None:
    chapters = list(range(1, 14))
    with ThreadPoolExecutor(max_workers=13) as ex:
        list(ex.map(clean_chapter, chapters))

    print('Generated chapter content files:')
    for ch in chapters:
        p = OUT_DIR / f'chapter-{ch:02d}-content.html'
        print(ch, p.stat().st_size, p.name)


if __name__ == '__main__':
    main()
