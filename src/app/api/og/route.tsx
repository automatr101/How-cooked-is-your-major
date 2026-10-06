import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// The link-preview image. It borrows the landing page's look: near-black background with a faint grid,
// the floating black pill bar, heavy italic uppercase headings with the last word in peach and a red
// wavy underline, and a tilted copy of the result card.
//
// Rules for Satori (the renderer): any element with more than one child must be display:flex, and a line
// of text that mixes literals and values must be one template string.

const BG = '#111111';
const CARD = '#191919';
const PEACH = '#ffe0c2'; // the site's primary colour (dark theme)
const RED = '#e54d2e'; // the site's destructive colour
const TEXT = '#eeeeee';
const MUTED = '#b4b4b4';
const FONT = 'https://cdn.jsdelivr.net/fontsource/fonts/geist@latest/latin-900-normal.woff';
const FONT_MONO = 'https://cdn.jsdelivr.net/fontsource/fonts/geist-mono@latest/latin-700-normal.woff';

// Loaded once per instance. If a font can't be fetched the image still renders, in the default font.
let fontsPromise: Promise<{ name: string; data: ArrayBuffer; weight: 900 | 700; style: 'normal' }[]> | null = null;
function loadFonts() {
  fontsPromise ??= Promise.all([
    fetch(FONT).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('font')))),
    fetch(FONT_MONO).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('font')))),
  ])
    .then(([black, mono]) => [
      { name: 'Geist', data: black, weight: 900 as const, style: 'normal' as const },
      { name: 'GeistMono', data: mono, weight: 700 as const, style: 'normal' as const },
    ])
    .catch(() => []);
  return fontsPromise;
}

// "M0,6 Q4,0 8,6 T16,6 T24,6 ..." : a wave with an 16px period, far longer than any heading word
const WAVE = 'M0,6 Q4,0 8,6' + ' T' + Array.from({ length: 140 }, (_, i) => `${(i + 2) * 8},6`).join(' T');

const scoreColor = (n: number) => (n > 80 ? RED : n > 40 ? '#f97316' : '#10b981');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const hasMajor = !!searchParams.get('major');
    const major = (searchParams.get('major') || '').slice(0, 80);
    const nScore = Math.max(0, Math.min(100, parseInt(searchParams.get('score') || '0') || 0));
    const level = (searchParams.get('level') || 'Unknown').slice(0, 30);
    const color = scoreColor(nScore);

    const fonts = await loadFonts();
    const sans = fonts.length ? 'Geist' : 'sans-serif';
    const mono = fonts.length ? 'GeistMono' : 'monospace';

    // Heading words: the last word is the peach, wavy-underlined one
    const words = (hasMajor ? major : 'How cooked is your major?').toUpperCase().split(/\s+/).filter(Boolean);
    const headSize = words.join(' ').length > 44 ? 46 : words.join(' ').length > 28 ? 58 : 74;

    const label = (text: string) => (
      <div style={{ display: 'flex', fontFamily: mono, fontSize: 13, fontWeight: 700, letterSpacing: 3, color: MUTED }}>{text}</div>
    );

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: BG,
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            padding: '40px 64px 56px',
            position: 'relative',
            fontFamily: sans,
            color: TEXT,
          }}
        >
          {/* glow behind the card */}
          <div style={{ position: 'absolute', right: -40, top: 80, width: 560, height: 560, borderRadius: 9999, backgroundColor: color, opacity: 0.1, filter: 'blur(110px)' }} />

          {/* the floating pill bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, borderRadius: 9999, backgroundColor: '#000000', border: '1px solid rgba(255,255,255,0.12)', padding: '0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 9999, backgroundColor: '#ffffff', color: '#000000', fontSize: 22, fontWeight: 900, transform: 'skewX(-8deg)' }}>CM</div>
              <div style={{ display: 'flex', fontFamily: mono, fontSize: 15, fontWeight: 700, letterSpacing: 2, color: '#ffffffcc' }}>HOW COOKED IS YOUR MAJOR?</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ display: 'flex', fontFamily: mono, fontSize: 14, fontWeight: 700, color: '#ffffff80' }}>how-cooked-is-your-major.vercel.app</div>
              <div style={{ display: 'flex', alignItems: 'center', height: 44, borderRadius: 9999, backgroundColor: '#ffffff', color: '#000000', padding: '0 24px', fontSize: 17, fontWeight: 900 }}>Scan yours</div>
            </div>
          </div>

          {/* body */}
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }}>
            {/* left: headline */}
            <div style={{ display: 'flex', flexDirection: 'column', width: 650 }}>
              <div style={{ display: 'flex', marginBottom: 22 }}>
                {label(hasMajor ? `AI RISK SCAN  ·  VERIFICATION ID #882-${nScore}` : 'AI RISK SCAN  ·  1,800+ MAJORS')}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 18, rowGap: 14, transform: 'skewX(-8deg)', paddingLeft: 10 }}>
                {words.map((w, i) => {
                  const last = i === words.length - 1;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      <div
                        style={{
                          display: 'flex',
                          fontSize: headSize,
                          fontWeight: 900,
                          lineHeight: 1.02,
                          letterSpacing: -2,
                          color: last ? PEACH : '#f4f4f4',
                        }}
                      >
                        {w}
                      </div>
                      {last && (
                        <div style={{ display: 'flex', position: 'absolute', left: 0, right: 0, bottom: -10, height: 12, overflow: 'hidden' }}>
                          <svg width="1200" height="12" viewBox="0 0 1200 12">
                            <path d={WAVE} fill="none" stroke={RED} strokeWidth="3.5" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 38 }}>
                {hasMajor ? (
                  <div style={{ display: 'flex', alignItems: 'center', height: 54, borderRadius: 9999, border: `2px solid ${color}`, color, padding: '0 26px', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', transform: 'skewX(-8deg)' }}>
                    {level}
                  </div>
                ) : (
                  <div style={{ display: 'flex', fontSize: 24, color: MUTED, fontWeight: 900 }}>Scan. Get roasted.</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', height: 54, borderRadius: 9999, backgroundColor: PEACH, color: '#081a1b', padding: '0 28px', fontSize: 20, fontWeight: 900, letterSpacing: 1, whiteSpace: 'nowrap' }}>
                  SCAN YOUR MAJOR FREE →
                </div>
              </div>
            </div>

            {/* right: the result card, tilted */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                width: 330,
                height: 412,
                borderRadius: 32,
                border: '4px solid #eeeeee',
                backgroundColor: CARD,
                padding: '26px 26px 22px',
                boxShadow: '10px 10px 0 rgba(0,0,0,0.5)',
                transform: 'rotate(4deg)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {label(hasMajor ? `VERIFICATION ID: #882-${nScore}` : 'VERIFICATION ID: #882-??')}
                <div style={{ display: 'flex', marginTop: 8, fontSize: 24, fontWeight: 900, lineHeight: 1.05, letterSpacing: -0.5, textTransform: 'uppercase' }}>
                  {hasMajor ? (major.length > 38 ? `${major.slice(0, 36)}…` : major) : 'Your major'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 14 }}>
                {label('AI RISK LEVEL')}
                <div style={{ display: 'flex', alignItems: 'baseline', color: hasMajor ? color : PEACH }}>
                  <div style={{ display: 'flex', fontSize: 104, fontWeight: 900, lineHeight: 1, letterSpacing: -4 }}>{hasMajor ? `${nScore}` : '??'}</div>
                  <div style={{ display: 'flex', fontSize: 36, fontWeight: 900, color: '#ffffff4d' }}>%</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 12 }}>
                {label('SURVIVAL STATUS')}
                <div style={{ display: 'flex', marginTop: 4, fontSize: 28, fontWeight: 900, textTransform: 'uppercase', color: hasMajor && nScore > 75 ? RED : TEXT, transform: 'skewX(-8deg)' }}>
                  {hasMajor ? level : 'Find out'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px dashed rgba(255,255,255,0.14)', paddingTop: 10, fontFamily: mono, fontSize: 9, fontWeight: 700, color: '#ffffff66', letterSpacing: 0.5 }}>
                <div style={{ display: 'flex' }}>DATA VERIFIED BY MAJORLABS INTELLIGENCE</div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: fonts.length ? fonts : undefined,
        headers: {
          'Cache-Control': 'public, max-age=31104000, immutable',
        },
      }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.log(message);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
