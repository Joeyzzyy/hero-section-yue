import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
    }

    const ttsRequestBody = {
      app: {
        appid: process.env.NEXT_PUBLIC_BYTEDANCE_APP_ID,
        token: process.env.NEXT_PUBLIC_BYTEDANCE_TOKEN,
        cluster: "volcano_icl"
      },
      user: {
        uid: `user_${Date.now()}`
      },
      audio: {
        voice_type: process.env.NEXT_PUBLIC_BYTEDANCE_VOICE_TYPE,
        encoding: "mp3",
        speed_ratio: 1
      },
      request: {
        reqid: crypto.randomUUID(),
        text: text,
        operation: "query"
      }
    };

    const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;${process.env.NEXT_PUBLIC_BYTEDANCE_TOKEN}`
      },
      body: JSON.stringify(ttsRequestBody)
    });

    if (!response.ok) {
      throw new Error(`ByteDance API responded with status: ${response.status}`);
    }

    const audioBlob = await response.blob();
    
    return new NextResponse(audioBlob, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}