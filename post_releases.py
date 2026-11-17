import pandas as pd
import numpy as np
import os
import json
import subprocess
import shutil
import sys
import traceback
import hashlib
from pathlib import Path
from datetime import datetime
import re
import xml.etree.ElementTree as ET

# ============================================
# CONFIGURATION - Hardcoded defaults (no .env needed)
# ============================================
RELEASES_FILE = 'releases.xlsx'
STORES_FILE = 'stores.xlsx'
OUTPUT_DIR = 'releases'
RELEASE_JSON = 'releases.json'
STORES_JSON = 'stores.json'
HASH_FILE = 'hash.json'
LOCAL_REPO_PATH = r"F:\Web\GitHub\hpsa"

# CDN paths
ARTWORK_BASE = "https://cdn.hyperproduction.co.za/artworks"
SAMPLE_BASE = "https://cdn.hyperproduction.co.za/samples"
STORES_BASE = "https://hyperproduction.co.za/logo/stores"

# Catalog settings
CATALOG_PREFIX = "HYP"
CATALOG_LENGTH = 6
DELETED_CATALOGS = ["HYP126A", "HYP045", "HYP050", "HYP082", "HYP139X"]

# Store icons
STORE_ICONS = {
    'Spotify': 'spotify.webp',
    'Apple Music': 'apple.webp',
    'Traxsource': 'traxsource.webp',
    'Youtube': 'youtube.webp',
    'Beatport': 'beatport.webp'
}

# ============================================
# ESCAPING HELPERS
# ============================================
def esc_html(s):
    """Escape text for HTML text content (between tags)."""
    if s is None:
        return ""
    return (str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;"))

def esc_attr(s):
    """Escape text for HTML attribute values (between double quotes)."""
    if s is None:
        return ""
    return (str(s)
        .replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;"))

def clean_upc(upc_val):
    """Normalise a UPC value: strip trailing .0 from float-like strings."""
    if upc_val is None:
        return ""
    s = str(upc_val).strip()
    if s.endswith('.0'):
        s = s[:-2]
    return s

# ============================================
# HELPER: Column name normalisation
# ============================================
def clean_column_names(df):
    df.columns = [col.strip() if isinstance(col, str) else col for col in df.columns]
    return df

def find_column(df, possible_names):
    df.columns = [str(col).strip() if isinstance(col, str) else col for col in df.columns]
    for name in possible_names:
        if name in df.columns:
            return name
        for col in df.columns:
            if str(col).strip().lower() == name.lower():
                return col
    return None

# ============================================
# HASH HELPERS
# ============================================
def content_hash(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()

def load_hashes():
    if os.path.exists(HASH_FILE):
        try:
            with open(HASH_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Could not read {HASH_FILE}: {e}. Treating as empty.")
    return {}

def save_hashes(hashes):
    with open(HASH_FILE, 'w', encoding='utf-8') as f:
        json.dump(hashes, f, indent=2, sort_keys=True)

# ============================================
# DATE FORMATTING
# ============================================
def format_date_iso(date_val):
    """Format a date value as YYYY-MM-DD for JSON-LD."""
    if date_val is None or pd.isna(date_val):
        return None
    try:
        if isinstance(date_val, str):
            date_val = pd.to_datetime(date_val, errors='coerce')
        if pd.isna(date_val):
            return None
        return date_val.strftime('%Y-%m-%d')
    except Exception:
        return None

def format_date_display(date_val):
    """Format a date value as '13 March 2020' for visible display."""
    if date_val is None or pd.isna(date_val):
        return None
    try:
        if isinstance(date_val, str):
            date_val = pd.to_datetime(date_val, errors='coerce')
        if pd.isna(date_val):
            return None
        return date_val.strftime('%-d %B %Y') if os.name != 'nt' else date_val.strftime('%#d %B %Y')
    except Exception:
        return None

# ============================================
# ARTIST SPLITTING
# ============================================
def split_artists(s):
    """Split a comma/ampersand-separated artist string into a list of names."""
    if not s or s == 'nan':
        return []
    parts = re.split(r'\s*,\s*', s)
    result = []
    for p in parts:
        for sub in re.split(r'\s*&\s*', p):
            sub = sub.strip()
            if sub:
                result.append(sub)
    return result

def artists_to_schema(artist_str):
    """Convert an artist string to a schema.org byArtist value.
    Returns a single MusicGroup for one artist, or a list for multiple."""
    names = split_artists(artist_str)
    if not names:
        return {"@type": "MusicGroup", "name": artist_str}
    if len(names) == 1:
        return {"@type": "MusicGroup", "name": names[0]}
    return [{"@type": "MusicGroup", "name": n} for n in names]

# ============================================
# SCAN EXISTING HTMLS
# ============================================
def scan_existing_htmls():
    existing = set()
    html_dir = Path(OUTPUT_DIR)
    if html_dir.exists():
        for file in html_dir.glob("*.html"):
            name = file.stem
            if name.startswith(CATALOG_PREFIX) and len(name) == CATALOG_LENGTH:
                existing.add(name)
    return existing

# ============================================
# GENERATE SITEMAP (MERGE) AND STATIC LINKS
# ============================================
def generate_sitemap_and_links(all_releases, df_rel, artist_col, title_col, cat_col, changed_cats=None):
    """Merge sitemap.xml with existing. Only <lastmod> of changed releases
    gets bumped to today. New releases added. Deleted ones removed.
    Returns the hidden <ul> HTML for the catalog page."""
    today = datetime.now().strftime('%Y-%m-%d')
    changed = set(changed_cats or [])

    link_list_html = ''
    for cat_no in all_releases:
        group = df_rel[df_rel[cat_col] == cat_no]
        row = group.iloc[0]
        artist = str(row.get(artist_col, '')) if artist_col else ''
        title = str(row.get(title_col, '')) if title_col else ''
        link_list_html += f'        <li><a href="/releases/{cat_no}.html">{cat_no} - {esc_html(artist)} - {esc_html(title)}</a></li>\n'

    NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace('', NS)
    sitemap_path = os.path.join(OUTPUT_DIR, 'sitemap.xml')

    # Read existing sitemap if present
    existing = {}
    if os.path.exists(sitemap_path):
        try:
            root = ET.parse(sitemap_path).getroot()
            for url in root.findall(f"{{{NS}}}url"):
                loc = url.findtext(f"{{{NS}}}loc") or ""
                lm  = url.findtext(f"{{{NS}}}lastmod") or today
                pr  = url.findtext(f"{{{NS}}}priority") or "0.8"
                cf  = url.findtext(f"{{{NS}}}changefreq") or "weekly"
                existing[loc] = (lm, pr, cf)
        except Exception as e:
            print(f"  ⚠️ Could not read existing sitemap ({e}); creating fresh.")

    def url_entry(loc, lm, pr, cf):
        u = ET.Element(f"{{{NS}}}url")
        ET.SubElement(u, f"{{{NS}}}loc").text = loc
        ET.SubElement(u, f"{{{NS}}}lastmod").text = lm
        ET.SubElement(u, f"{{{NS}}}priority").text = pr
        ET.SubElement(u, f"{{{NS}}}changefreq").text = cf
        return u

    new_root = ET.Element(f"{{{NS}}}urlset")

    # Root catalog entry
    root_loc = "https://hyperproduction.co.za/releases/"
    lm, pr, cf = existing.get(root_loc, (today, "1.0", "daily"))
    new_root.append(url_entry(root_loc, lm, pr, cf))

    # One entry per release
    wanted = {root_loc}
    for cat_no in all_releases:
        loc = f"https://hyperproduction.co.za/releases/{cat_no}.html"
        wanted.add(loc)
        if loc in existing and cat_no not in changed:
            lm, pr, cf = existing[loc]
        else:
            lm, pr, cf = today, "0.8", "weekly"
        new_root.append(url_entry(loc, lm, pr, cf))

    removed = [loc for loc in existing if loc not in wanted]

    ET.ElementTree(new_root).write(sitemap_path, encoding='UTF-8', xml_declaration=True)
    print(f"✅ Sitemap merged: {sitemap_path} "
          f"({len(all_releases)} releases, {len(changed)} updated, {len(removed)} removed)")
    return link_list_html

# ============================================
# SCHEMA.ORG TYPE MAPPING
# ============================================
def release_type_to_schema(release_type):
    """Map Excel Release Type to schema.org @type."""
    if not release_type:
        return "MusicRelease"
    rt = str(release_type).strip().lower()
    if rt == "album":
        return "MusicAlbum"
    return "MusicRelease"

# ============================================
# GENERATE RELEASE HTML
# ============================================
def generate_release_html(cat_no, artist, title, tracks, stores, release_date, release_type, upc):
    """Generate a release page using the shared HYP001 release-page layout."""

    # De-duplicate tracks while preserving their original order.
    unique_tracks = []
    seen = set()
    for track in tracks:
        track_artist = str(track.get('artist') or '').strip()
        track_title = str(track.get('title') or '').strip()
        track_mix = str(track.get('mix') or '').strip()
        key = f"{track_artist}|{track_title}|{track_mix}"
        if key not in seen:
            seen.add(key)
            unique_tracks.append({
                **track,
                'artist': track_artist,
                'title': track_title,
                'mix': track_mix
            })

    artist = str(artist or '').strip()
    title = str(title or '').strip()
    cat_no = str(cat_no).strip()
    stores = stores or {}

    date_iso = format_date_iso(release_date)
    date_display = format_date_display(release_date)
    track_count = len(unique_tracks)
    track_info = "featuring 1 track" if track_count == 1 else f"featuring {track_count} tracks"

    if date_display:
        meta_description_raw = f"{artist} - {title}. {track_info}. Released {date_display} on Hyper Production (SA)."
    else:
        meta_description_raw = f"{artist} - {title}. {track_info}. Released on Hyper Production (SA)."

    schema_type = release_type_to_schema(release_type)

    # Preserve the existing SEO and structured-data fields.
    ld = {
        "@context": "https://schema.org",
        "@type": schema_type,
        "name": title,
        "byArtist": artists_to_schema(artist),
        "catalogNumber": cat_no,
        "description": meta_description_raw,
        "image": f"{ARTWORK_BASE}/{cat_no}.png",
        "url": f"https://hyperproduction.co.za/releases/{cat_no}.html",
        "recordLabel": {
            "@type": "Organization",
            "name": "Hyper Production (SA)",
            "url": "https://hyperproduction.co.za/"
        }
    }
    if date_iso:
        ld["datePublished"] = date_iso
    if upc and str(upc).strip():
        ld["gtin"] = str(upc).strip()

    if unique_tracks:
        track_entities = []
        for track in unique_tracks:
            track_name = track['title'] or 'Untitled'
            if track.get('mix'):
                track_name += f" ({track['mix']})"
            track_artist_str = track['artist'] or artist
            entity = {
                "@type": "MusicRecording",
                "name": track_name,
                "byArtist": artists_to_schema(track_artist_str)
            }
            isrc = str(track.get('isrc') or '').strip()
            if isrc and isrc.lower() != 'nan':
                entity["isrcCode"] = isrc
            track_entities.append(entity)
        ld["track"] = track_entities

    json_ld_str = json.dumps(ld, indent=4, ensure_ascii=False)

    # Escaped values for HTML.
    meta_description = esc_attr(meta_description_raw)
    artist_html = esc_html(artist)
    title_html = esc_html(title)
    title_og = esc_attr(f"{artist} - {title} | Hyper Production (SA)")
    title_attr = esc_attr(f"{artist} - {title}")

    # Match HYP001's artist treatment: first credited artist highlighted.
    artist_names = split_artists(artist)
    if artist_names:
        artist_display_html = (
            f"<strong>{esc_html(artist_names[0])}</strong>"
            + "".join(f", {esc_html(name)}" for name in artist_names[1:])
        )
    else:
        artist_display_html = artist_html

    # Match HYP001's DSP order and icon treatment.
    store_icons = {
        'Spotify': '/logo/dsp-icons/spotify.svg',
        'Apple Music': '/logo/dsp-icons/apple.svg',
        'Traxsource': '/logo/dsp-icons/traxsource.svg',
        'Beatport': '/logo/stores/beatport.webp',
        'Youtube': '/logo/stores/youtube.webp'
    }
    store_labels = {
        'Spotify': 'Listen on Spotify',
        'Apple Music': 'Listen on Apple Music',
        'Traxsource': 'Listen on Traxsource',
        'Beatport': 'Listen on Beatport',
        'Youtube': 'Watch on YouTube'
    }
    store_links_html = []
    for store_name, icon_file in store_icons.items():
        store_url = stores.get(store_name, '')
        if store_url is None or str(store_url).strip().lower() in ('', 'nan', 'none'):
            continue
        store_links_html.append(
            f'<a class="store-link" style="--store-icon:url(\'{icon_file}\')" '
            f'href="{esc_attr(str(store_url).strip())}" target="_blank" rel="noopener noreferrer" '
            f'aria-label="{esc_attr(store_labels[store_name])}">'
            f'<span class="store-icon" aria-hidden="true"></span></a>'
        )
    store_links_html = "\n                    ".join(store_links_html)

    # Track rows follow the HYP001 hierarchy: number, title/mix, credited artist.
    tracklist_rows = []
    for index, track in enumerate(unique_tracks, 1):
        track_title = esc_html(track['title'] or 'Untitled')
        if track.get('mix'):
            track_title += f" ({esc_html(track['mix'])})"
        track_artist = esc_html(track['artist'] or artist)
        tracklist_rows.append(f'''<li class="release-track">
                            <span class="track-number">{index:02d}</span>
                            <span><span class="track-name">{track_title}</span><span class="track-mix">{track_artist}</span></span>
                            <span class="track-mark" aria-hidden="true">♪</span>
                        </li>''')
    tracklist_html = "\n                        ".join(tracklist_rows)

    release_type_clean = str(release_type or '').strip().lower()
    if release_type_clean in ('album', 'music album'):
        format_label = 'Digital album'
    elif release_type_clean in ('ep', 'extended play'):
        format_label = 'Digital EP'
    elif release_type_clean in ('single', 'music release', ''):
        format_label = 'Digital single'
    else:
        format_label = f"Digital {esc_html(str(release_type).strip().lower())}"

    date_fact_html = ''
    if date_display:
        date_fact_html = (
            f'<div class="release-fact"><span class="release-fact-label">Release date</span>'
            f'<span class="release-fact-value"><time datetime="{esc_attr(date_iso or "")}">'
            f'{esc_html(date_display)}</time></span></div>'
        )

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{artist_html} - {title_html} | Hyper Production (SA)</title>
    <meta name="description" content="{meta_description}" />
    <link rel="canonical" href="https://hyperproduction.co.za/releases/{esc_attr(cat_no)}.html" />
    <meta property="og:title" content="{title_og}" />
    <meta property="og:description" content="{meta_description}" />
    <meta property="og:image" content="{ARTWORK_BASE}/{esc_attr(cat_no)}.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="1200" />
    <meta property="og:url" content="https://hyperproduction.co.za/releases/{esc_attr(cat_no)}.html" />
    <meta property="og:type" content="music.song" />
    <meta property="og:site_name" content="Hyper Production (SA)" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{title_og}" />
    <meta name="twitter:description" content="{meta_description}" />
    <meta name="twitter:image" content="{ARTWORK_BASE}/{esc_attr(cat_no)}.png" />
    <meta name="twitter:site" content="@hyperprosa" />
    <script type="application/ld+json">
{json_ld_str}
    </script>
    <link rel="stylesheet" href="/css/style.css" />
    <link rel="icon" href="https://hyperproduction.co.za/logo/site-icon.png" type="image/png" />
</head>
<body class="release-page">
    <header id="my-sticky-header">
        <a href="https://hyperproduction.co.za/" title="Home">
            <img src="https://hyperproduction.co.za/logo/HPSA-gold.png" alt="Hyper Production (SA) – Home" />
        </a>
    </header>

    <main class="release-shell">
        <div class="release-layout">
            <section class="release-visual" aria-label="Release artwork and audio preview">
                <div class="release-art-frame">
                    <img class="release-art" src="{ARTWORK_BASE}/{esc_attr(cat_no)}.png" onerror="this.src='https://hyperproduction.co.za/placeholder.png'" alt="{title_attr} artwork" />
                    <button class="preview-button" id="preview-toggle" type="button" aria-label="Play audio preview" aria-pressed="false">
                        <svg class="play-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.8c0-.8.9-1.3 1.6-.9l10 6.2a1.1 1.1 0 0 1 0 1.8l-10 6.2c-.7.4-1.6-.1-1.6-.9V5.8Z"/></svg>
                        <svg class="pause-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>
                    </button>
                </div>
                <p class="store-heading">Available on</p>
                <nav class="release-stores" aria-label="Listen and buy">
                    {store_links_html}
                </nav>
            </section>

            <section class="release-copy" aria-labelledby="release-title">
                <h1 id="release-title">{title_html}</h1>
                <p class="release-artists">{artist_display_html}</p>

                <div class="release-facts" aria-label="Release details">
                    <div class="release-fact"><span class="release-fact-label">Catalogue</span><span class="release-fact-value">{esc_html(cat_no)}</span></div>
                    {date_fact_html}
                    <div class="release-fact"><span class="release-fact-label">Format</span><span class="release-fact-value">{format_label}</span></div>
                </div>

                <div class="track-section">
                    <div class="track-heading"><span>Tracklist</span><span class="track-count">{track_count:02d} tracks</span></div>
                    <ol class="release-tracklist">
                        {tracklist_html}
                    </ol>
                </div>
            </section>
        </div>
    </main>

    <footer id="my-sticky-footer">
        <div class="footer-inner">
            <p class="copyright">&copy; 2026 <strong>Hyper Production (SA)</strong>. All Rights Reserved.</p>
            <div class="social-icons">
                <a href="https://facebook.com/hyperproductionsa" target="_blank" rel="noopener noreferrer" title="Facebook"><img src="https://hyperproduction.co.za/logo/facebook.png" alt="Facebook" /></a>
                <a href="https://instagram.com/hyperprosa" target="_blank" rel="noopener noreferrer" title="Instagram"><img src="https://hyperproduction.co.za/logo/instagram.png" alt="Instagram" /></a>
                <a href="https://www.youtube.com/@hyperproductionsa" target="_blank" rel="noopener noreferrer" title="YouTube"><img src="https://hyperproduction.co.za/logo/youtube.png" alt="YouTube" /></a>
            </div>
        </div>
    </footer>

    <script>
        (() => {{
            const audio = new Audio('{SAMPLE_BASE}/{esc_attr(cat_no)}.m4a');
            audio.preload = 'none';
            const button = document.getElementById('preview-toggle');

            const setPlaying = (playing) => {{
                button.classList.toggle('is-playing', playing);
                button.setAttribute('aria-pressed', String(playing));
                button.setAttribute('aria-label', playing ? 'Pause audio preview' : 'Play audio preview');
            }};

            button.addEventListener('click', async () => {{
                if (audio.paused) {{
                    try {{
                        await audio.play();
                    }} catch (error) {{
                        setPlaying(false);
                    }}
                }} else {{
                    audio.pause();
                }}
            }});

            audio.addEventListener('play', () => setPlaying(true));
            audio.addEventListener('pause', () => setPlaying(false));
            audio.addEventListener('ended', () => setPlaying(false));
            audio.addEventListener('error', () => setPlaying(false));
        }})();
    </script>
</body>
</html>'''

    return html

# ============================================
# LOAD STORES DATA
# ============================================
def load_stores_data(df_stores, all_releases):
    stores_data = {}
    if df_stores is not None and not df_stores.empty:
        store_cat_col = find_column(df_stores, ['Catalogue Number', 'Catalog Number', 'Catalog', 'Cat No', 'Catalogue No'])
        if store_cat_col:
            for _, row in df_stores.iterrows():
                cat = str(row[store_cat_col]).strip()
                if cat in all_releases or not all_releases:
                    stores_data[cat] = {
                        'Spotify': row.get('Spotify URL', ''),
                        'Apple Music': row.get('Apple Music URL', ''),
                        'Traxsource': row.get('Traxsource URL', ''),
                        'Youtube': row.get('Youtube URL', ''),
                        'Beatport': row.get('Beatport URL', '')
                    }
    return stores_data

# ============================================
# GENERATE ALL RELEASES
# ============================================
def generate_all_releases():
    try:
        print("\n📂 Reading Excel files...")

        if not os.path.exists(RELEASES_FILE):
            print(f"❌ {RELEASES_FILE} not found!")
            return [], []

        df_rel = pd.read_excel(RELEASES_FILE).replace({np.nan: ""})
        df_rel = clean_column_names(df_rel)
        print(f"   {RELEASES_FILE}: {len(df_rel)} rows")

        df_stores = None
        if os.path.exists(STORES_FILE):
            df_stores = pd.read_excel(STORES_FILE).replace({np.nan: ""})
            df_stores = clean_column_names(df_stores)
            print(f"   {STORES_FILE}: {len(df_stores)} rows")

        cat_col = find_column(df_rel, ['Catalogue Number', 'Catalog Number', 'Catalog', 'Cat No', 'Catalogue No'])
        if not cat_col:
            print(f"❌ No catalog column found in {RELEASES_FILE}!")
            print(f"   Available columns: {list(df_rel.columns)}")
            return [], []

        artist_col = find_column(df_rel, ['Release Artist', 'Artist', 'Main Artist'])
        title_col = find_column(df_rel, ['Release Title', 'Title', 'Track Title'])
        upc_col = find_column(df_rel, ['UPC', 'Upc', 'upc'])
        date_col = find_column(df_rel, ['Release Date', 'Date', 'Publication Date'])
        type_col = find_column(df_rel, ['Release Type', 'Type'])
        track_artist_col = find_column(df_rel, ['Track Artist', 'Artist'])
        track_title_col = find_column(df_rel, ['Track Title', 'Title'])
        track_mix_col = find_column(df_rel, ['Track Mix', 'Mix'])
        isrc_col = find_column(df_rel, ['ISRC', 'Isrc', 'isrc'])
        status_col = find_column(df_rel, ['Release Status', 'Status'])
        genre_col = find_column(df_rel, ['Main Genre', 'Genre'])
        track_num_col = find_column(df_rel, ['Track Number', 'Track No', 'Track'])

        print(f"   Using columns:")
        print(f"     Catalog: '{cat_col}'")
        print(f"     Artist: '{artist_col}'")
        print(f"     Title: '{title_col}'")
        print(f"     Date: '{date_col}'")
        print(f"     Type: '{type_col}'")
        print(f"     Status: '{status_col}'")
        print(f"     Genre: '{genre_col}'")
        print(f"     UPC: '{upc_col}'")
        print(f"     ISRC: '{isrc_col}'")
        print(f"     Track#: '{track_num_col}'")

        os.makedirs(OUTPUT_DIR, exist_ok=True)

        existing_htmls = scan_existing_htmls()
        print(f"\n📁 Found {len(existing_htmls)} existing HTML files")

        previous_hashes = load_hashes()
        print(f"📁 Loaded {len(previous_hashes)} previous hashes")

        all_releases = []
        for cat_no, group in df_rel.groupby(cat_col):
            cat_no = str(cat_no).strip()
            if cat_no.startswith(CATALOG_PREFIX) and len(cat_no) == CATALOG_LENGTH:
                try:
                    int(cat_no[len(CATALOG_PREFIX):])
                    all_releases.append(cat_no)
                except ValueError:
                    pass

        all_releases.sort(key=lambda x: int(x[len(CATALOG_PREFIX):]))
        print(f"✅ Found {len(all_releases)} releases in Excel")

        stores_data = load_stores_data(df_stores, all_releases)

        max_num = 0
        max_cat = None
        for cat in stores_data.keys():
            if cat.startswith(CATALOG_PREFIX) and len(cat) == CATALOG_LENGTH:
                try:
                    num = int(cat[len(CATALOG_PREFIX):])
                    if num > max_num:
                        max_num = num
                        max_cat = cat
                except ValueError:
                    pass

        if max_cat:
            print(f"📊 Max catalog with store links: {max_cat} ({max_num})")

        releases_to_generate = []
        for cat in all_releases:
            try:
                num = int(cat[len(CATALOG_PREFIX):])
                if num <= max_num and cat not in DELETED_CATALOGS:
                    releases_to_generate.append(cat)
            except ValueError:
                pass

        new_releases = [cat for cat in releases_to_generate if cat not in existing_htmls]

        print(f"\n📄 Releases with store links: {len(releases_to_generate)}")
        if new_releases:
            print(f"   🆕 New releases to generate: {len(new_releases)}")
            for cat in new_releases[:5]:
                print(f"      - {cat}")
            if len(new_releases) > 5:
                print(f"      ... and {len(new_releases) - 5} more")

        generated_html = []
        skipped_html = []
        new_hashes = {}

        for cat_no in releases_to_generate:
            try:
                group = df_rel[df_rel[cat_col] == cat_no]
                row = group.iloc[0]

                artist = str(row.get(artist_col, '')) if artist_col else ''
                title = str(row.get(title_col, '')) if title_col else ''
                release_date = row.get(date_col) if date_col else None
                release_type = str(row.get(type_col, '')) if type_col else ''
                upc = clean_upc(row.get(upc_col, '')) if upc_col else ''

                tracks = []
                for _, r in group.iterrows():
                    track_artist = str(r.get(track_artist_col, '')) if track_artist_col else ''
                    track_title = str(r.get(track_title_col, '')) if track_title_col else ''
                    track_mix = str(r.get(track_mix_col, '')) if track_mix_col else ''
                    isrc = str(r.get(isrc_col, '')) if isrc_col else ''
                    tracks.append({
                        'artist': track_artist if track_artist != 'nan' else '',
                        'title': track_title if track_title != 'nan' else '',
                        'mix': track_mix if track_mix != 'nan' else '',
                        'isrc': isrc if isrc != 'nan' else ''
                    })

                stores = stores_data.get(cat_no, {})
                html_content = generate_release_html(
                    cat_no, artist, title, tracks, stores,
                    release_date, release_type, upc
                )

                h = content_hash(html_content)
                new_hashes[cat_no] = h

                if previous_hashes.get(cat_no) == h:
                    skipped_html.append(cat_no)
                    continue

                output_file = os.path.join(OUTPUT_DIR, f"{cat_no}.html")
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(html_content)

                generated_html.append(cat_no)
                status = "🆕 New" if cat_no in new_releases else "📝 Updated"
                print(f"  {status}: {cat_no}.html")
            except Exception as e:
                print(f"  ❌ Error generating {cat_no}: {e}")

        save_hashes(new_hashes)

        # Sitemap: merge, only bump <lastmod> for HTML pages rewritten this run
        link_list_html = generate_sitemap_and_links(
            all_releases, df_rel, artist_col, title_col, cat_col,
            changed_cats=generated_html
        )

        if skipped_html:
            print(f"  ⏭️  Skipped (unchanged): {len(skipped_html)} files")

        # -------------------------------------------------
        # Build releases.json (enriched with full metadata)
        # -------------------------------------------------
        json_data = []
        for cat_no in all_releases:
            try:
                group = df_rel[df_rel[cat_col] == cat_no]
                row = group.iloc[0]

                def g(k):
                    v = row.get(k, '') if k else ''
                    return '' if (v is None or str(v) == 'nan') else str(v).strip()

                artist       = g(artist_col)
                title        = g(title_col)
                upc          = clean_upc(row.get(upc_col, '') if upc_col else '')
                release_date = format_date_iso(row.get(date_col)) if date_col else None
                rel_status   = g(status_col)
                rel_type     = g(type_col)
                genre        = g(genre_col)

                tracks = []
                for i, (_, r) in enumerate(group.iterrows(), 1):
                    def gt(k):
                        v = r.get(k, '') if k else ''
                        return '' if (v is None or str(v) == 'nan') else str(v).strip()

                    tn_raw = r.get(track_num_col, '') if track_num_col else ''
                    try:
                        tn = int(float(tn_raw)) if str(tn_raw).strip() not in ('', 'nan') else i
                    except (ValueError, TypeError):
                        tn = i

                    tracks.append({
                        'track_number': tn,
                        'isrc':   gt(isrc_col),
                        'artist': gt(track_artist_col),
                        'title':  gt(track_title_col),
                        'mix':    gt(track_mix_col),
                    })

                json_data.append({
                    "cat":            cat_no,
                    "artist":         artist,
                    "title":          title,
                    "upc":            upc,
                    "release_date":   release_date,
                    "release_status": rel_status,
                    "release_type":   rel_type,
                    "main_genre":     genre,
                    "artwork_url":    f"{ARTWORK_BASE}/{cat_no}.png",
                    "release_url":    f"https://hyperproduction.co.za/releases/{cat_no}.html",
                    "tracks":         tracks,
                    "stores":         stores_data.get(cat_no, {}),
                })
            except Exception as e:
                print(f"  ❌ Error building JSON for {cat_no}: {e}")

        json_data.sort(key=lambda x: int(x['cat'][len(CATALOG_PREFIX):]), reverse=True)

        with open(RELEASE_JSON, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=4, ensure_ascii=False)
        print(f"\n✅ Updated: {RELEASE_JSON} ({len(json_data)} releases)")

        if stores_data:
            stores_json_data = []
            for cat, stores in stores_data.items():
                if cat in all_releases:
                    has_store = False
                    for store_name in ['Spotify', 'Apple Music', 'Traxsource', 'Youtube', 'Beatport']:
                        if stores.get(store_name, '') and str(stores.get(store_name, '')) != 'nan':
                            has_store = True
                            break

                    if has_store:
                        try:
                            row = df_rel[df_rel[cat_col] == cat].iloc[0]
                            store_entry = {
                                "Catalogue Number": cat,
                                "Release Artist": str(row.get(artist_col, '')) if artist_col else '',
                                "Release Title": str(row.get(title_col, '')) if title_col else '',
                            }
                            for store_name in ['Spotify', 'Apple Music', 'Traxsource', 'Youtube', 'Beatport']:
                                if stores.get(store_name, '') and str(stores.get(store_name, '')) != 'nan':
                                    store_entry[store_name] = stores.get(store_name, '')
                            stores_json_data.append(store_entry)
                        except Exception as e:
                            print(f"  ❌ Error building store entry for {cat}: {e}")

            stores_json_data.sort(key=lambda x: int(x['Catalogue Number'][len(CATALOG_PREFIX):]), reverse=True)
            with open(STORES_JSON, 'w', encoding='utf-8') as f:
                json.dump(stores_json_data, f, indent=4)
            print(f"✅ Updated: {STORES_JSON} ({len(stores_json_data)} releases with store links)")

        # ============================================
        # GENERATE INDEX.HTML (hidden <ul> only)
        # ============================================
        print("\n📝 Generating releases-index.html with hidden SEO content...")

        index_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Releases Catalog | Hyper Production (SA) - Afro House Record Label</title>
    <meta name="description" content="Browse the full catalog of Hyper Production (SA) releases. Afro House from South Africa's premier independent record label." />
    
    <meta property="og:title" content="Releases Catalog | Hyper Production (SA)" />
    <meta property="og:description" content="Browse the full catalog of Hyper Production (SA) releases. Afro House from South Africa's premier independent record label." />
    <meta property="og:image" content="https://hyperproduction.co.za/logo/fb-thumb.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="https://hyperproduction.co.za/releases/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Hyper Production (SA)" />
    
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Releases Catalog | Hyper Production (SA)" />
    <meta name="twitter:description" content="Browse the full catalog of Hyper Production (SA) releases. Afro House from South Africa." />
    <meta name="twitter:image" content="https://hyperproduction.co.za/logo/x-thumb.png" />
    <meta name="twitter:site" content="@hyperprosa" />
    
    <script type="application/ld+json">
    {{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Releases Catalog | Hyper Production (SA)",
        "description": "Browse the full catalog of Hyper Production (SA) releases. Afro House from South Africa's premier independent record label.",
        "url": "https://hyperproduction.co.za/releases/",
        "about": {{
            "@type": "MusicRecordLabel",
            "name": "Hyper Production (SA)",
            "url": "https://hyperproduction.co.za/",
            "foundingDate": "2014",
            "genre": "Afro House",
            "address": {{
                "@type": "PostalAddress",
                "addressCountry": "ZA"
            }}
        }},
        "mainEntity": {{
            "@type": "ItemList",
            "name": "Hyper Production (SA) Releases",
            "description": "Complete catalog of releases from Hyper Production (SA)",
            "itemListOrder": "https://schema.org/ItemListOrderDescending"
        }}
    }}
    </script>
    
    <link rel="canonical" href="https://hyperproduction.co.za/releases/" />
    
    <link rel="stylesheet" href="/css/style.css" />
    <link rel="icon" href="https://hyperproduction.co.za/logo/site-icon.png" type="image/png" />
    
    <link rel="sitemap" type="application/xml" title="Sitemap" href="/releases/sitemap.xml" />
    
    <noscript>
        <style>
            .nojs-container {{
                max-width: 1200px;
                margin: 0 auto;
                padding: 140px 20px 100px 20px;
                color: #ffffff;
                text-align: center;
            }}
            .nojs-container h1 {{
                font-family: 'HyperPixel', sans-serif;
                font-size: clamp(2rem, 5vw, 3.5rem);
                color: #ffffff;
                margin-bottom: 40px;
            }}
            .nojs-message {{
                color: #aaaaaa;
                font-family: 'Roboto', Arial, sans-serif;
                font-size: 1rem;
                line-height: 1.8;
                max-width: 600px;
                margin: 0 auto;
            }}
            .nojs-message a {{
                color: #e4de69;
                text-decoration: none;
            }}
            .nojs-message a:hover {{
                text-decoration: underline;
            }}
        </style>
        <div class="nojs-container">
            <h1>Releases</h1>
            <div class="nojs-message">
                <p>JavaScript is required to view the full catalog.</p>
                <p>Please enable JavaScript or <a href="/releases/releases.json">view the releases JSON data</a>.</p>
            </div>
        </div>
    </noscript>
</head>
<body>
    <header id="my-sticky-header">
        <a href="https://hyperproduction.co.za/" title="Home">
            <img src="https://hyperproduction.co.za/logo/HPSA-gold.png" alt="Hyper Production (SA) – Home" />
        </a>
    </header>

    <div id="hp-catalog-container">
        <h1 class="catalog-title">Releases</h1>
        
        <div id="catalog-controls">
            <div class="search-wrapper">
                <input type="text" id="search-input" placeholder="🔍 Search releases..." />
            </div>
            <div class="page-selector-wrapper">
                <span>Page:</span>
                <select id="page-select"></select>
            </div>
        </div>
        
        <div id="details-view" style="display:none;"></div>
        <div id="grid-view">
            <div id="grid" class="release-grid"></div>
            <div id="pagination" class="pagination">
                <span class="page-arrow" id="prev-page" style="display:none;">&laquo;</span>
                <span class="page-num active" data-page="1">1</span>
                <span class="page-num" data-page="2">2</span>
                <span class="page-num" data-page="3">3</span>
                <span class="page-num" data-page="4">4</span>
                <span class="page-num" data-page="5">5</span>
                <span class="page-num" data-page="6">6</span>
                <span class="page-num" data-page="7">7</span>
                <span class="page-arrow" id="next-page">&raquo;</span>
            </div>
        </div>
    </div>

    <!-- ============================================ -->
    <!-- HIDDEN CONTENT FOR BOTS (not visible to users) -->
    <!-- ============================================ -->
    <div style="display:none;" aria-hidden="true">
        <h2>Releases Catalog - Full List</h2>
        <ul>
{link_list_html}        </ul>
    </div>

    <footer id="my-sticky-footer">
        <div class="footer-inner">
            <p class="copyright">&copy; 2026 <strong>Hyper Production (SA)</strong>. All Rights Reserved.</p>
            <div class="social-icons">
                <a href="https://facebook.com/hyperproductionsa" target="_blank" title="Facebook"><img src="https://hyperproduction.co.za/logo/facebook.png" alt="Facebook" /></a>
                <a href="https://instagram.com/hyperprosa" target="_blank" title="Instagram"><img src="https://hyperproduction.co.za/logo/instagram.png" alt="Instagram" /></a>
                <a href="https://www.youtube.com/@hyperproductionsa" target="_blank" title="YouTube"><img src="https://hyperproduction.co.za/logo/youtube.png" alt="YouTube" /></a>
            </div>
        </div>
    </footer>

    <script src="/js/releases.js"></script>
</body>
</html>'''

        index_path = os.path.join(OUTPUT_DIR, 'index.html')
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(index_html)
        print(f"✅ Updated: {index_path}")

        print(f"\n🎉 Successfully generated {len(generated_html)} HTML pages ({len(skipped_html)} skipped as unchanged)!")
        print(f"📊 Updated JSON files with all {len(json_data)} releases")
        print(f"📝 Merged sitemap.xml ({len(all_releases)} releases, {len(generated_html)} updated)")
        return generated_html, json_data

    except Exception as e:
        print(f"\n❌ ERROR in generate_all_releases(): {e}")
        traceback.print_exc()
        return [], []

# ============================================
# COPY TO LOCAL GITHUB REPO AND PUSH
# ============================================
def copy_to_local_repo_and_push():
    try:
        print("\n📤 Copying to local GitHub repository...")

        git_path = shutil.which('git')
        if not git_path:
            possible_paths = [
                r"C:\Program Files\Git\bin\git.exe",
                r"C:\Program Files (x86)\Git\bin\git.exe",
            ]
            for path in possible_paths:
                if os.path.exists(path):
                    git_path = path
                    break

        if not git_path:
            print("❌ Git not found! Please install Git and add it to your PATH.")
            return False

        print(f"   Using Git: {git_path}")

        if not os.path.exists(LOCAL_REPO_PATH):
            print(f"❌ Local repo path not found: {LOCAL_REPO_PATH}")
            return False

        git_dir = os.path.join(LOCAL_REPO_PATH, '.git')
        if not os.path.exists(git_dir):
            print(f"❌ {LOCAL_REPO_PATH} is not a Git repository!")
            return False

        print(f"✅ Found local repo: {LOCAL_REPO_PATH}")

        releases_repo = os.path.join(LOCAL_REPO_PATH, 'releases')
        os.makedirs(releases_repo, exist_ok=True)

        html_count = 0
        for file in os.listdir(OUTPUT_DIR):
            src = os.path.join(OUTPUT_DIR, file)
            dst = os.path.join(releases_repo, file)
            shutil.copy(src, dst)
            if file.endswith('.html'):
                html_count += 1
        print(f"  ✅ Copied: {html_count} HTML files + sitemap.xml")

        for json_file in [RELEASE_JSON, STORES_JSON]:
            if os.path.exists(json_file):
                src = os.path.join(os.getcwd(), json_file)
                dst = os.path.join(LOCAL_REPO_PATH, json_file)
                shutil.copy(src, dst)
                print(f"  ✅ Copied: {json_file}")

        for folder in ['privacy', 'demo-submission']:
            src = os.path.join(os.getcwd(), folder)
            dst = os.path.join(LOCAL_REPO_PATH, folder)
            if os.path.exists(src):
                shutil.copytree(src, dst, dirs_exist_ok=True)
                print(f"  ✅ Copied: {folder}/")

        print("\n📤 Committing and pushing to GitHub...")
        os.chdir(LOCAL_REPO_PATH)

        subprocess.run([git_path, "add", "-A"], check=True, capture_output=True)
        print("  ✅ Added all files")

        # Commit if there are staged changes
        status = subprocess.run([git_path, "status", "--porcelain"], capture_output=True, text=True)
        if status.stdout:
            print("  📝 Changes detected")
            commit_msg = f"Update releases: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            subprocess.run([git_path, "commit", "-m", commit_msg], check=True, capture_output=True)
            print(f"✅ Committed: {commit_msg}")
        else:
            print("ℹ️ Nothing new to commit")

        # Check for ANY unpushed commits — even from a previous run
        ahead = subprocess.run(
            [git_path, "rev-list", "--count", "origin/main..HEAD"],
            capture_output=True, text=True
        )
        try:
            pending = int((ahead.stdout or "0").strip() or "0")
        except ValueError:
            pending = 0

        if pending == 0:
            print("ℹ️ No commits to push — already up to date with origin/main")
            return True

        # Pull --rebase so local commit(s) replay on top of remote
        print("  🔄 Pulling latest changes from GitHub (rebase)...")
        pull_result = subprocess.run(
            [git_path, "pull", "--rebase", "origin", "main"],
            check=False, capture_output=True, text=True
        )
        if pull_result.returncode != 0:
            print(f"  ❌ Pull failed: {(pull_result.stderr or pull_result.stdout).strip()}")
            subprocess.run([git_path, "rebase", "--abort"], capture_output=True)
            return False
        print("  ✅ Pulled latest changes")

        print(f"  ⬆️  Pushing {pending} commit(s) to GitHub...")
        try:
            subprocess.run([git_path, "push", "origin", "main"],
                           check=True, capture_output=True, text=True)
            print("✅ Pushed to GitHub!")
        except subprocess.CalledProcessError as e:
            err = e.stderr.decode() if isinstance(e.stderr, bytes) else (e.stderr or "")
            print(f"❌ Git push failed:\n{err}")
            return False

        return True

    except subprocess.CalledProcessError as e:
        print(f"❌ Git command failed: {e}")
        if hasattr(e, 'stderr') and e.stderr:
            print(f"   Error output: {e.stderr.decode() if isinstance(e.stderr, bytes) else e.stderr}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        traceback.print_exc()
        return False

# ============================================
# MAIN
# ============================================
def main():
    print("=" * 60)
    print("  HYPER PRODUCTION (SA) - RELEASE GENERATOR")
    print("=" * 60)
    print(f"  Current Directory: {os.getcwd()}")
    print(f"  Local Repo: {LOCAL_REPO_PATH}")
    print("=" * 60)

    try:
        generated_html, json_data = generate_all_releases()

        if not json_data:
            print("❌ No releases were found. Check your Excel file.")
            input("\nPress Enter to exit...")
            return

        copy_to_local_repo_and_push()

        print("\n" + "=" * 60)
        print("🎉 ALL DONE! Releases are now live on GitHub.")
        print(f"📄 Generated {len(generated_html)} HTML pages")
        print(f"📊 Updated {RELEASE_JSON} with {len(json_data)} releases")
        print("📝 Merged sitemap.xml with all releases")
        print("🔗 https://hyperproduction.co.za/releases/")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        traceback.print_exc()

    input("\n✅ Press Enter to exit...")


if __name__ == "__main__":
    main()