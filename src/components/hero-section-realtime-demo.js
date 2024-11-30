'use client';
import React, { useRef, useEffect, useState } from 'react';
import styles from './hero-section-realtime-demo.module.css';
import { ElevenLabsClient } from "elevenlabs";

const HeroSectionRealtimeDemo = () => {
  // ================ State Management ================
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [floatingTags, setFloatingTags] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const playingRef = useRef(false);
  const [processingState, setProcessingState] = useState('idle'); // 'idle' | 'thinking' | 'answering'

  // ================ Audio Control Functions ================
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // 处理用户交互
  useEffect(() => {
    const handleInteraction = () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      // 移除事件监听器
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // ================ Canvas Animation System ================
  useEffect(() => {
    if (canvasRef.current) {
      initCanvas();
    }
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    setCanvasSize();
    
    const particles = [];
    const particleCount = 50;
    
    class Particle {
      constructor() {
        this.reset();
      }
      
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
        this.opacity = Math.random() * 0.5 + 0.2;
      }
      
      update() {
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < 0 || this.x > canvas.width) this.reset();
        if (this.y < 0 || this.y > canvas.height) this.reset();
      }
      
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${this.opacity})`;
        ctx.fill();
      }
    }
    
    // 初始化粒子
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    
    // 动画循环
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制半透明背景以产生拖尾效果
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // 处理窗口调整
    const handleResize = () => {
      setCanvasSize();
      particles.forEach(particle => particle.reset());
    };
    
    window.addEventListener('resize', handleResize);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  };

  // ================ Audio Control Functions ================
  // Stop current speech
  const stopSpeech = () => {
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setIsSpeaking(false);
    setFloatingTags([]);
    setIsExpanded(true);
    playingRef.current = false;
  };

  // Generate speech
  const generateSpeech = async (text, bulletPoints = []) => {
    try {
      stopSpeech();
      
      if (bulletPoints && bulletPoints.length > 0) {
        const styleGenerator = generateTagStyle();
        const floatingTags = bulletPoints.map((point, index) => ({
          id: Math.random(),
          text: point,
          style: styleGenerator(index, bulletPoints.length)
        }));
        
        setFloatingTags(floatingTags);
        setIsExpanded(false);
      } else {
        setFloatingTags([]);
        setIsExpanded(true);
      }

      // TTS API call
      const client = new ElevenLabsClient({
        apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
      });
      
      const audioStream = await client.textToSpeech.convert(
        process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID, 
        {
          model_id: "eleven_monolingual_v1",
          text: text,
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        },
        { stream: false }
      );

      // Process audio stream
      const chunks = [];
      try {
        while (true) {
          const { done, value } = await audioStream.reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        audioStream.reader.releaseLock();
      }
      
      // Create audio element
      const audioData = new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      // Set audio event handlers
      audio.onended = () => {
        setIsSpeaking(false);
        setFloatingTags([]);
        setIsExpanded(true);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        console.error('Error details:', audio.error);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      
      // 返回一个 Promise，在音频播放完成时 resolve
      return new Promise((resolve) => {
        audio.addEventListener('ended', () => {
          setIsSpeaking(false);
          resolve();
        });
      });

    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
      setIsExpanded(true);
      setFloatingTags([]);
      throw error;
    }
  };

  // ================ Tag Generation System ================
  // Generate tag styles
  const generateTagStyle = () => {
    return (index, totalTags) => {
      const verticalSpacing = 50;
      const startY = -(totalTags - 1) * verticalSpacing / 2;
      const y = startY + (index * verticalSpacing);
      
      return {
        position: 'absolute',
        top: `calc(50% + ${y}px)`,
        left: 'calc(50% + 60px)',
        transform: 'translate(0, -50%)',
        opacity: 0,
        animation: `${styles.fadeIn} 0.6s ease-out forwards`,
        backgroundColor: 'rgba(79, 70, 229, 0.8)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '9999px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(8px)',
        fontSize: '1rem',
        whiteSpace: 'nowrap',
        zIndex: 20,
        '--y': `${y}px`,
      };
    };
  };

  // ================ API Call Handling ================
  const handleSubmit = async () => {
    if (!userInput.trim() || playingRef.current) return;
    
    setProcessingState('thinking');
    playingRef.current = true;
    
    try {
      const response = await fetch('http://dify.sheet2email.com/v1/workflows/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DIFY_API_KEY}`,
        },
        body: JSON.stringify({
          inputs: { Question: userInput },
          response_mode: "blocking",
          user: "default_user",
          language: "en"
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data?.outputs?.result) {
        setProcessingState('answering');
        const result = JSON.parse(data.data.outputs.result);
        await generateSpeech(result.answer, result.bulletPoints || []);
      }
    } catch (error) {
      console.error('Request error:', error);
    } finally {
      setProcessingState('idle');
      playingRef.current = false;
    }
  };

  // 处理开始按钮点击
  const handleStart = () => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // ================ Render UI ================
  return (
    <div className={styles['banner-container']}>
      {/* Avatar container */}
      <div className={`${styles['avatar-container']} ${isExpanded ? '' : styles['avatar-contracted']}`}>
        <div className={`relative ${isExpanded ? 'w-64 h-64' : 'w-48 h-48'} transition-all duration-500 
          ${!isExpanded ? '-translate-x-20' : ''}`}>
          <img
            src="/images/zhuyue.png"
            alt="Digital Avatar"
            className="w-full h-full rounded-full border-4 border-indigo-300/50 backdrop-blur-sm transition-all duration-500"
          />
          {/* Floating tags */}
          {floatingTags.map(tag => (
            <div key={tag.id} style={tag.style} className="transform">
              {tag.text}
            </div>
          ))}
        </div>
      </div>

      {/* Visual effect Canvas */}
      <canvas
        ref={canvasRef}
        className={styles['visual-effect']}
      />

      {/* Input control area */}
      <div className="relative z-20 max-w-2xl mx-auto p-4 w-full">
        <div className="relative">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl bg-white/10 border border-indigo-300/30 
                      text-white backdrop-blur-md focus:ring-2 focus:ring-indigo-500 
                      focus:border-transparent transition-all duration-300 pr-12"
            placeholder="Ask me anything..."
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-full">
            {userInput && (
              <button
                onClick={() => setUserInput('')}
                className="text-gray-400 hover:text-white transition-colors p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSubmit}
            disabled={processingState !== 'idle' || !userInput.trim()}
            className="flex-1 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 
                      hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl
                      transform hover:scale-105 transition-all duration-300 
                      disabled:opacity-50 disabled:hover:scale-100 shadow-lg 
                      shadow-indigo-500/30 font-medium"
          >
            {processingState === 'thinking' ? (
              <span className="flex items-center justify-center">
                Thinking
                <span className="ml-2 animate-pulse">...</span>
              </span>
            ) : processingState === 'answering' ? (
              <span className="flex items-center justify-center">
                Answering
                <span className="ml-2 animate-pulse">...</span>
              </span>
            ) : 'Send'}
          </button>
          
          {isSpeaking && (
            <button
              onClick={stopSpeech}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 
                        hover:from-red-600 hover:to-pink-600 text-white rounded-xl
                        transform hover:scale-105 transition-all duration-300 font-medium"
            >
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroSectionRealtimeDemo;
