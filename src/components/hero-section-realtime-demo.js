'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './hero-section-realtime-demo.module.css';
import { ElevenLabsClient } from "elevenlabs";
import PhotoWall from './photo-wall';

// 添加字符限制常量
const CHARACTER_LIMIT = 128;

// 添加语言常量
const LANGUAGES = {
  EN: 'en'
};

// 添加内容字典
const CONTENT = {
  greeting: "Hey, I'm YueZhu (Joey)",
  roles: [
    "Product Manager 💼",
    "Developer 💻",
    "Chill Seeker 🏖"
  ],
  iAm: "I am a",
  description: "Working hard now, so I can relax later. 💪 Life is a journey, not a race.",
  inputPlaceholder: "Ask me anything...",
  characterLimit: "Please keep your message under 128 characters",
  sendButton: "Send",
  thinkingStatus: "Thinking",
  answeringStatus: "Answering",
  stopButton: "Stop",
  chatHistory: {
    title: "Conversation History",
    empty: {
      title: "Start a conversation",
      subtitle: "Your chat history will appear here"
    },
    you: "You",
    assistant: "Joey.Z",
    keyPoints: "Key Points:",
    videoRecommendation: "Video Recommendation:",
    openVideo: "Open video in new window →"
  },
  mobileMessage: {
    title: "Oops! Desktop Only",
    greeting: "Hey there, mobile friend! 👋",
    line1: "I'm a bit of a desktop diva 💅",
    line2: "Let's chat on a bigger screen!",
    waiting: "Waiting for desktop...",
    funFact: "Fun fact: I'm not just being difficult,\nI genuinely want to give you the best experience! 🌟"
  },
  photoWall: {
    slowDown: "Slow Down",
    speedUp: "Speed Up"
  }
};

const HeroSectionRealtimeDemo = () => {
  // ================ State Management ================
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const [userInput, setUserInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [floatingTags, setFloatingTags] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const playingRef = useRef(false);
  const [processingState, setProcessingState] = useState('idle'); // 'idle' | 'thinking' | 'answering'
  const [chatHistory, setChatHistory] = useState([]);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(true);
  const [isManuallyOpened, setIsManuallyOpened] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mainContentRef = useRef(null);
  const historyPanelRef = useRef(null);
  const [isManualToggle, setIsManualToggle] = useState(false);
  const manualToggleTimeoutRef = useRef(null);
  const [isOverLimit, setIsOverLimit] = useState(false);

  // 修改语言状态的初始值
  const [currentLanguage] = useState(LANGUAGES.EN);

  // 添加一个状态来跟踪是否应该播放视频
  const [shouldPlay, setShouldPlay] = useState(false);

  // 添加预加载状态
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  // 添加预加载逻辑
  useEffect(() => {
    // 预加载图片
    const avatarImage = new Image();
    avatarImage.src = '/images/zhuyue.webp';
    avatarImage.onload = () => setImageLoaded(true);

    // 预加载视频
    const videoElement = document.createElement('video');
    videoElement.preload = 'auto';
    videoElement.src = '/images/zhuyue-lipmoving.mp4';
    videoElement.onloadeddata = () => setVideoLoaded(true);

    return () => {
      videoElement.src = '';
      avatarImage.src = '';
    };
  }, []);

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
  const stopSpeech = useCallback(() => {
    console.log('调用 stopSpeech...');
    
    const audioElements = document.querySelectorAll('audio');
    console.log('找到的音频素数量:', audioElements.length);
    
    audioElements.forEach((audio, index) => {
      console.log(`停止音频 ${index}`);
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.remove();
      } catch (error) {
        console.error(`停止音频 ${index} 时出错:`, error);
      }
    });
    
    // 停止视频并切换回图片
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setShowVideo(false);
    
    // 重置所有状态
    setIsSpeaking(false);
    setFloatingTags([]);
    setIsExpanded(true);
    playingRef.current = false;
    setProcessingState('idle');
    
    console.log('Speech stop completed');
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      // 组件卸载时确保清理视频资源
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    };
  }, []);

  // Generate speech
  const generateSpeech = async (text, bulletPoints = []) => {
    try {
      stopSpeech();
      setProcessingState('answering');
      
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

      // 使用 ElevenLabs TTS 服务
      const client = new ElevenLabsClient({
        apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
      });
      
      const audioStream = await client.textToSpeech.convert(
        process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID, 
        {
          model_id: "eleven_multilingual_v1",
          text: text,
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
            speaking_rate: 1.0
          }
        },
        { stream: false }
      );

      // 修改视频显示和播放逻辑
      setShowVideo(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (videoRef.current) {
        try {
          await videoRef.current.play();
        } catch (error) {
          console.error('视频播放失败:', error);
          setShowVideo(false);
        }
      }
      
      setIsSpeaking(true);

      // 创建和播放音频
      const audio = new Audio();
      audio.style.display = 'none';
      document.body.appendChild(audio);

      // ElevenLabs TTS 返回的是流数据
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
      
      const audioData = new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      audio.src = audioUrl;

      audio.onended = () => {
        stopSpeech();
        if (currentLanguage === LANGUAGES.EN) {
          URL.revokeObjectURL(audio.src);
        }
        audio.remove();
      };

      audio.onerror = (error) => {
        console.error('音频播放错误:', error);
        stopSpeech();
        if (currentLanguage === LANGUAGES.EN) {
          URL.revokeObjectURL(audio.src);
        }
        audio.remove();
      };

      await audio.play();

      return new Promise((resolve) => {
        audio.addEventListener('ended', () => {
          stopSpeech();
          resolve();
        });
      });

    } catch (error) {
      console.error('TTS error:', error);
      setShowVideo(false);
      stopSpeech();
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
      const currentInput = userInput;
      setUserInput('');
      setChatHistory(prev => [
        { type: 'user', content: currentInput },
        ...prev
      ]);

      const historyString = chatHistory
        .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .reverse()
        .join('\n');
      
      const response = await fetch('https://dify.sheet2email.com/v1/workflows/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DIFY_API_KEY}`,
        },
        body: JSON.stringify({
          inputs: { 
            Question: userInput,
            History: historyString || '',
            Lang: currentLanguage
          },
          response_mode: "blocking",
          user: "default_user",
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data?.outputs?.result) {
        const result = JSON.parse(data.data.outputs.result);
        setChatHistory(prev => [
          { // 新消息放在数组开头
            type: 'ai', 
            content: result.answer,
            video: result.video,
            bulletPoints: result.bulletPoints
          },
          ...prev
        ]);
        
        setProcessingState('answering');
        try {
          await generateSpeech(result.answer, result.bulletPoints || []);
        } catch (error) {
          console.error('Speech generation error:', error);
          setProcessingState('idle');
        }
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

  // 添加处理回车的函数
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // 止换行
      if (userInput.trim() && processingState === 'idle') {
        handleSubmit();
      }
    }
  };

  // 添加移动设备检测
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 修改检查面板重叠的函数
  const checkPanelOverlap = useCallback(() => {
    if (!mainContentRef.current || !historyPanelRef.current) return;
    
    // 如果面板是手动打开的,则跳过自动检查
    if (isManuallyOpened) return;

    const mainContent = mainContentRef.current.getBoundingClientRect();
    const historyPanel = historyPanelRef.current.getBoundingClientRect();

    const overlap = mainContent.left - (historyPanel.left + historyPanel.width) < 20;
    if (overlap && isHistoryPanelOpen) {
      setIsHistoryPanelOpen(false);
    }
  }, [isHistoryPanelOpen, isManuallyOpened]);

  // 修改切换按钮的点击处理函数
  const handlePanelToggle = () => {
    const newOpenState = !isHistoryPanelOpen;
    setIsHistoryPanelOpen(newOpenState);
    
    // 如果是手动打开面板,设置手动标记
    if (newOpenState) {
      setIsManuallyOpened(true);
    } else {
      // 如果是手动关闭面板,清除手动标记
      setIsManuallyOpened(false);
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (manualToggleTimeoutRef.current) {
        clearTimeout(manualToggleTimeoutRef.current);
      }
    };
  }, []);

  // 添加窗大小变化监听
  useEffect(() => {
    const handleResize = () => {
      checkPanelOverlap();
    };

    window.addEventListener('resize', handleResize);
    // 初始检查
    checkPanelOverlap();

    return () => window.removeEventListener('resize', handleResize);
  }, [checkPanelOverlap]);

  // 修改 input onChange 处理函数
  const handleInputChange = (e) => {
    const input = e.target.value;
    setUserInput(input);
    setIsOverLimit(input.length > CHARACTER_LIMIT);
  };

  // 添加一个控制头像视频的方法
  const handleAvatarVideoControl = ({ show, play, speaking }) => {
    console.log('handleAvatarVideoControl 被调用:', { show, play, speaking });
    
    if (show && play) {
      console.log('尝试播放视频...');
      console.log('videoRef.current 状态:', videoRef.current);
      
      setShowVideo(true);
      setShouldPlay(true);
      
      // 使用 setTimeout 确保状态更新后再播放视频
      setTimeout(() => {
        if (videoRef.current) {
          console.log('重置视频位置并开始播放');
          videoRef.current.currentTime = 0;
          
          videoRef.current.play()
            .then(() => {
              console.log('视频开始播放成功');
            })
            .catch(error => {
              console.error('视频播放失败:', error);
            });
        } else {
          console.error('videoRef.current 不存在');
        }
      }, 100);
    } else {
      console.log('停止视频播放');
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setShowVideo(false);
      setShouldPlay(false);
    }
    
    setIsSpeaking(speaking);
  };

  // 添加对视频显示状态的监听
  useEffect(() => {
    console.log('视频显示状态改变:', { showVideo, shouldPlay });
    if (showVideo && shouldPlay && videoRef.current) {
      console.log('useEffect 中尝试播放视频');
      videoRef.current.currentTime = 0;
      videoRef.current.play()
        .then(() => {
          console.log('useEffect 中视频播放成功');
        })
        .catch(error => {
          console.error('useEffect 中视频播放失败:', error);
        });
    }
  }, [showVideo, shouldPlay]);

  // 修改 Avatar 部分的渲染逻辑
  const renderAvatar = () => (
    <div className={`${styles['avatar-container']} ${isExpanded ? '' : styles['avatar-contracted']}`}>
      <div className={`relative ${isExpanded ? 'w-64 h-64' : 'w-48 h-48'} transition-all duration-500 
        ${!isExpanded ? '-translate-x-20' : ''}`}>
        {/* 添加加载占位符 */}
        {!imageLoaded && !showVideo && (
          <div className="absolute inset-0 bg-indigo-900/20 rounded-full animate-pulse" />
        )}
        
        <img
          src="/images/zhuyue.webp"
          alt="Digital Avatar"
          className={`w-full h-full rounded-full border-4 border-indigo-300/50 backdrop-blur-sm 
            transition-all duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          style={{ display: showVideo ? 'none' : 'block' }}
        />
        
        {showVideo && (
          <>
            {/* 添加视频加载占位符 */}
            {!videoLoaded && (
              <div className="absolute inset-0 bg-indigo-900/20 rounded-full animate-pulse" />
            )}
            <video
              ref={videoRef}
              src="/images/zhuyue-lipmoving.mp4"
              className={`absolute inset-0 w-full h-full rounded-full border-4 
                border-indigo-300/50 backdrop-blur-sm transition-all duration-500 ease-in-out
                ${videoLoaded && showVideo ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}`}
              style={{
                transform: showVideo ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: 'center',
                objectFit: 'cover'
              }}
              preload="auto"
              playsInline
              muted
              loop
              onLoadedData={() => setVideoLoaded(true)}
            />
          </>
        )}
        
        {floatingTags.map(tag => (
          <div key={tag.id} style={tag.style} className="transform">
            {tag.text}
          </div>
        ))}
      </div>
    </div>
  );

  // ================ Render UI ================
  return (
    <>
      {isMobile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg">
          <div className="relative max-w-md p-8 bg-gradient-to-br from-indigo-600/90 to-purple-600/90 rounded-2xl shadow-2xl border border-white/20 m-4 overflow-hidden">
            {/* 添加动态背景效果 */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-grid-white/10 animate-grid-flow"></div>
              <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-shine"></div>
            </div>
            
            <div className="relative flex flex-col items-center text-center space-y-6">
              {/* 更酷的图标动画 */}
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
                <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
                <div className="relative w-full h-full bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <svg className="w-16 h-16 text-white animate-float" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              {/* 标题动画效果 */}
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 animate-gradient">
                  Oops! Desktop Only
                </h2>
                <div className="h-1 w-32 mx-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full animate-pulse"></div>
              </div>

              {/* 更有趣的文案 */}
              <div className="space-y-4 text-white/90">
                <p className="text-lg leading-relaxed">
                  Hey there, mobile friend! 👋
                  <br />
                  I'm a bit of a desktop diva 💅
                  <br />
                  Let's chat on a bigger screen!
                </p>
                
                <div className="flex items-center justify-center space-x-2 text-sm text-white/60">
                  <span className="animate-bounce">⌛</span>
                  <span>Waiting for desktop...</span>
                  <span className="animate-bounce" style={{animationDelay: '0.1s'}}>⌛</span>
                </div>
              </div>

              {/* 添加有趣的底部提示 */}
              <div className="pt-6 space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
                <p className="text-sm text-white/50 italic">
                  Fun fact: I'm not just being difficult,
                  <br />
                  I genuinely want to give you the best experience! 🌟
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className={styles['banner-container']}>
        {/* Chat history panel */}
        <div 
          ref={historyPanelRef}
          className={`absolute left-4 top-4 bottom-4 w-80 transition-all duration-300 ease-in-out ${
            chatHistory.length > 0 ? 'bg-black/30 backdrop-blur-sm' : 'bg-black/20'
          } rounded-xl overflow-hidden z-10 ${
            isHistoryPanelOpen ? 'translate-x-0' : '-translate-x-[calc(100%-2rem)]'
          }`}
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-white/10 backdrop-blur-md flex justify-between items-center">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                />
              </svg>
              <h3 className="font-medium text-white/90">{CONTENT.chatHistory.title}</h3>
            </div>
            {/* 添加切换按钮 */}
            <button 
              onClick={handlePanelToggle}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg 
                className={`w-5 h-5 text-white/70 transition-transform duration-300 ${
                  isHistoryPanelOpen ? 'rotate-0' : 'rotate-180'
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Messages Container */}
          <div className={`h-[calc(100%-4rem)] overflow-y-auto ${styles['chat-scroll']}`}>
            {chatHistory.length === 0 ? (
              <div className="p-8 text-center text-white/50">
                <svg className="w-12 h-12 mx-auto mb-3 text-indigo-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z"
                  />
                </svg>
                <p className="text-sm font-medium">{CONTENT.chatHistory.empty.title}</p>
                <p className="text-xs mt-1">{CONTENT.chatHistory.empty.subtitle}</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {chatHistory.map((message, index) => (
                  <div 
                    key={index} 
                    className={`mb-4 ${message.type === 'user' ? 'text-blue-300' : 'text-green-300'}`}
                  >
                    <div className="text-sm opacity-70 mb-1 font-medium">
                      {message.type === 'user' ? CONTENT.chatHistory.you : CONTENT.chatHistory.assistant}:
                    </div>
                    <div className="text-white/80 bg-white/5 rounded-lg p-3 text-sm">
                      {message.content}
                      {message.type === 'ai' && message.bulletPoints && message.bulletPoints.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-indigo-300">{CONTENT.chatHistory.keyPoints}</p>
                          <ul className="list-disc list-inside space-y-1 pl-2">
                            {message.bulletPoints.map((point, idx) => (
                              <li key={idx} className="text-white/70">
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {message.type === 'ai' && message.video && (
                        <div className="mt-3">
                          <p className="text-indigo-300 mb-2">{CONTENT.chatHistory.videoRecommendation}</p>
                          <div className="relative aspect-video rounded-lg overflow-hidden">
                            <video 
                              src={message.video}
                              className="w-full"
                              controls
                            />
                          </div>
                          <a 
                            href={message.video} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            {CONTENT.chatHistory.openVideo}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 新的主要内容容器 */}
        <div 
          ref={mainContentRef}
          className="absolute top-1/2 left-1/2 z-10 flex flex-col items-center justify-center space-y-8 w-full max-w-2xl px-4"
          style={{ 
            transform: 'translate(-50%, -50%) scale(0.85)',
            transformOrigin: 'center center'
          }}
        >
          {/* 问候语部分 */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-300 via-cyan-300 to-indigo-400 animate-gradient">
                {CONTENT.greeting}
              </span>
            </h1>
            
            <div className="relative">
              <div className="flex items-center justify-center space-x-3 text-xl text-white/80">
                <span className={styles['typing-text']}>{CONTENT.iAm}</span>
                <div className={styles['dynamic-text']}>
                  {CONTENT.roles.map((role, index) => (
                    <span key={index}>{role}</span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-lg text-white/70 max-w-xl mx-auto leading-relaxed backdrop-blur-sm py-2">
              {CONTENT.description}
            </p>
          </div>

          {renderAvatar()}

          {/* 输入控制区域 */}
          <div className="w-full">
            <div className="relative">
              <input
                type="text"
                value={userInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={processingState !== 'idle' || isSpeaking}
                className={`w-full px-6 py-4 rounded-2xl bg-white/10 border 
                          ${isOverLimit ? 'border-red-500' : 'border-indigo-300/30'}
                          text-white backdrop-blur-md focus:ring-2 
                          ${isOverLimit ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}
                          focus:border-transparent transition-all duration-300 
                          pr-24
                          ${processingState !== 'idle' || isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={CONTENT.inputPlaceholder}
                maxLength={CHARACTER_LIMIT + 10}
              />
              {/* Character count indicator - 调整样式确保始终可见 */}
              <div className={`absolute right-14 top-1/2 -translate-y-1/2 text-sm 
                            ${isOverLimit ? 'text-red-400' : 'text-gray-400'}
                            bg-slate-900/80 px-1 rounded`}>
                {userInput.length}/{CHARACTER_LIMIT}
              </div>
              {/* Clear button */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
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
            
            {/* Error message */}
            {isOverLimit && (
              <div className="text-red-400 text-sm mt-2 ml-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{CONTENT.characterLimit}</span>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSubmit}
                disabled={processingState !== 'idle' || !userInput.trim() || isOverLimit || isSpeaking}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 
                          hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl
                          transform hover:scale-105 transition-all duration-300 
                          disabled:opacity-50 disabled:hover:scale-100 shadow-lg 
                          shadow-indigo-500/30 font-medium"
              >
                {processingState === 'thinking' ? (
                  <span className="flex items-center justify-center">
                    {CONTENT.thinkingStatus}
                    <span className="ml-2 animate-pulse">...</span>
                  </span>
                ) : processingState === 'answering' ? (
                  <span className="flex items-center justify-center">
                    {CONTENT.answeringStatus}
                    <span className="ml-2 animate-pulse">...</span>
                  </span>
                ) : CONTENT.sendButton}
              </button>
              
              {processingState === 'answering' && (
                <button
                  onClick={stopSpeech}
                  className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 
                            hover:from-red-600 hover:to-pink-600 text-white rounded-xl
                            transform hover:scale-105 transition-all duration-300 font-medium"
                >
                  {CONTENT.stopButton}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Visual effect Canvas */}
        <canvas
          ref={canvasRef}
          className={styles['visual-effect']}
        />
      </div>
      <PhotoWall onTTSStateChange={handleAvatarVideoControl} />
    </>
  );
};

export default HeroSectionRealtimeDemo;