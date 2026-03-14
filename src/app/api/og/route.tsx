import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const major = searchParams.get('major') || 'Unknown Major';
    const score = searchParams.get('score') || '0';
    const level = searchParams.get('level') || 'Fine';
    
    // Determine color based on score
    const nScore = parseInt(score);
    const color = nScore > 80 ? '#ef4444' : nScore > 60 ? '#f97316' : '#10b981';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #0a0a0a 100%)',
            fontFamily: 'sans-serif',
            padding: '40px',
          }}
        >
          {/* Logo / Title Area */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ padding: '8px 16px', borderRadius: '50px', backgroundColor: '#171717', border: '1px solid #262626', color: '#10b981', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em' }}>
                Intelligence Vector V.04
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#171717', padding: '60px', borderRadius: '48px', border: '2px solid #262626', width: '800px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
             <div style={{ fontSize: '24px', color: '#737373', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Major Analysis For:
             </div>
             <div style={{ fontSize: '64px', color: '#ffffff', fontWeight: 900, marginBottom: '40px', textAlign: 'center' }}>
                {major}
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '100px', color: color, fontWeight: 900, lineHeight: 1 }}>
                        {score}%
                    </div>
                    <div style={{ fontSize: '20px', color: '#737373', fontWeight: 700, textTransform: 'uppercase' }}>
                        AI Risk Score
                    </div>
                </div>

                <div style={{ width: '2px', height: '100px', backgroundColor: '#262626' }} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '40px', color: '#ffffff', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic' }}>
                        {level}
                    </div>
                    <div style={{ fontSize: '20px', color: '#737373', fontWeight: 700, textTransform: 'uppercase' }}>
                        Survival Status
                    </div>
                </div>
             </div>
          </div>

          <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <div style={{ fontSize: '14px', color: '#404040', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                © 2026 MAJORLABS INTELLIGENCE
             </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
