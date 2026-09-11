import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          borderRadius: '12px',
          color: 'white',
          fontSize: '38px',
          fontWeight: 'bold',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        M
      </div>
    ),
    { ...size }
  );
}
