import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const major = searchParams.get('major') || 'Your Major';
    const score = searchParams.get('score') || '0';
    const level = searchParams.get('level') || 'Unknown';

    const nScore = parseInt(score);
    const scoreColor = nScore > 80 ? '#ef4444' : nScore > 60 ? '#f97316' : nScore > 33 ? '#eab308' : '#22c55e';
    const bgGlow = nScore > 80 ? '#ef444420' : nScore > 60 ? '#f9731620' : nScore > 33 ? '#eab30820' : '#22c55e20';
    const statusEmoji = nScore > 80 ? '💀' : nScore > 60 ? '🔥' : nScore > 33 ? '🍳' : '✅';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            backgroundColor: '#080808',
            padding: '64px 80px',
            fontFamily: 'sans-serif',
            position: 'relative',
          }}
        >
          {/* Background glow accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '500px',
              height: '500px',
              borderRadius: '9999px',
              backgroundColor: bgGlow,
              filter: 'blur(120px)',
            }}
          />

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: scoreColor }} />
              <span style={{ fontSize: '13px', color: '#555', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
                MAJORLABS INTELLIGENCE
              </span>
            </div>
            <span style={{ fontSize: '13px', color: '#333', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              how-cooked-is-your-major.vercel.app
            </span>
          </div>

          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center', paddingTop: '40px' }}>
            <div style={{ fontSize: '13px', color: '#555', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em' }}>
              VERIFICATION ID: #882-{score} · AI Scan Report
            </div>
            <div style={{
              fontSize: major.length > 25 ? '60px' : '72px',
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 0.9,
              textTransform: 'uppercase',
              letterSpacing: '-0.03em',
              maxWidth: '750px',
            }}>
              {major}
            </div>

            {/* Score row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '40px', marginTop: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: '#444', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em' }}>
                  AI RISK SCORE
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '130px', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                    {score}
                  </span>
                  <span style={{ fontSize: '40px', fontWeight: 900, color: '#333', lineHeight: 1 }}>%</span>
                </div>
              </div>

              <div style={{ width: '2px', height: '80px', backgroundColor: '#222', marginBottom: '24px' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
                <span style={{ fontSize: '12px', color: '#444', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em' }}>
                  SURVIVAL STATUS
                </span>
                <span style={{
                  fontSize: '44px',
                  fontWeight: 900,
                  color: scoreColor,
                  textTransform: 'uppercase',
                  fontStyle: 'italic',
                  letterSpacing: '-0.02em',
                }}>
                  {statusEmoji} {level}
                </span>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '16px', color: '#404040', fontWeight: 700 }}>
              Check yours →
            </span>
            <div style={{
              padding: '12px 28px',
              borderRadius: '9999px',
              backgroundColor: '#181818',
              border: `1px solid ${scoreColor}40`,
              color: scoreColor,
              fontSize: '14px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
            }}>
              SCAN YOUR MAJOR FREE
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
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
