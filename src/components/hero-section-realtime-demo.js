'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './hero-section-realtime-demo.module.css';
import { ElevenLabsClient } from "elevenlabs";
import PhotoWall from './photo-wall';

// 添加字符限制常量
const CHARACTER_LIMIT = 128;

// 添加语言常量
export const LANGUAGES = {
  EN: 'en',
  ZH: 'zh'
};

// 添加内容字典
export const CONTENT = {
  [LANGUAGES.EN]: {
    greeting: "Hey, I'm YueZhu (Joey)",
    roles: [
      "Product Manager 💼",
      "Programmer 💻",
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
      assistant: "YueZhu (Joey)",
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
    preferredLanguage: "You prefer to chat with me in",
    photoWall: {
      slowDown: "Slow Down",
      speedUp: "Speed Up"
    }
  },
  [LANGUAGES.ZH]: {
    greeting: "你好，我是朱越",
    roles: [
      "产品经理 💼",
      "程序员 💻",
      "享受人生大师 🏖",
    ],
    iAm: "我是一名",
    description: "人生是段旅程，不是赛跑。💪",
    inputPlaceholder: "和我聊点什么...",
    characterLimit: "请将消息控制在128字符以内",
    sendButton: "发送",
    thinkingStatus: "思考中",
    answeringStatus: "回答中",
    stopButton: "停止",
    chatHistory: {
      title: "对话历史",
      empty: {
        title: "开始对话",
        subtitle: "你的聊天记录将显示在这里"
      },
      you: "你",
      assistant: "朱越",
      keyPoints: "要点：",
      videoRecommendation: "视频推荐：",
      openVideo: "在新窗口打开视频 →"
    },
    mobileMessage: {
      title: "抱歉！仅支持桌面版",
      greeting: "亲爱的移动端用户！👋",
      line1: "我是个桌面端控 💅",
      line2: "让我们在更大的屏幕上聊天吧！",
      waiting: "等待切换到桌面端...",
      funFact: "有趣的是：这不是故意为难你，我真心想给你最好的体验！🌟"
    },
    preferredLanguage: "你希望和我交流时用",
    photoWall: {
      slowDown: "减速",
      speedUp: "加速"
    }
  }
};

// 添加字节语音服务的配置
const BYTEDANCE_TTS_CONFIG = {
  APP_ID: process.env.NEXT_PUBLIC_BYTEDANCE_APP_ID,
  TOKEN: process.env.NEXT_PUBLIC_BYTEDANCE_TOKEN,
  VOICE_TYPE: process.env.NEXT_PUBLIC_BYTEDANCE_VOICE_TYPE,
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
  const [isMobile, setIsMobile] = useState(false);
  const mainContentRef = useRef(null);
  const historyPanelRef = useRef(null);
  const [isManualToggle, setIsManualToggle] = useState(false);
  const manualToggleTimeoutRef = useRef(null);
  const [isOverLimit, setIsOverLimit] = useState(false);

  // 添加语言状态
  const [currentLanguage, setCurrentLanguage] = useState(LANGUAGES.EN);

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

      let audioStream;
      
      // 根据当前语言选择不同的 TTS 服务
      if (currentLanguage === LANGUAGES.ZH) {
        console.log('开始生成中文语音...');
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text
          })
        });

        if (!response.ok) {
          throw new Error(`字节跳动 TTS API 错误: ${response.status}`);
        }

        const data = await response.json();
        console.log('收到 TTS 响应:', data);
        
        if (data.code === 3000 && data.data) {
          console.log('开始处理音频数据...');
          // 创建一个 Blob 对象，将base64音频数据转换为二进制
          const audioData = atob(data.data);
          const arrayBuffer = new ArrayBuffer(audioData.length);
          const view = new Uint8Array(arrayBuffer);
          for (let i = 0; i < audioData.length; i++) {
            view[i] = audioData.charCodeAt(i);
          }
          
          const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          const audio = new Audio();
          audio.style.display = 'none';
          audio.preload = 'auto';
          document.body.appendChild(audio);

          // 添加视频显示逻辑
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
          

          return new Promise((resolve, reject) => {
            let isPlaying = false;  // 添加播放状态标志
            console.log('设置音频事件监听器...');
            
            audio.oncanplaythrough = async () => {
              console.log('音频可以播放了...');
              if (isPlaying) {
                console.log('已经在播放中，忽略重复触发');
                return;
              }
              
              try {
                isPlaying = true;  // 设置播放状态
                await audio.play();
                console.log('开始播放音频');
                setIsSpeaking(true);
              } catch (error) {
                console.error('播放失败:', error);
                isPlaying = false;  // 重置播放状态
                reject(error);
              }
            };

            audio.onended = () => {
              console.log('音频播放结束');
              isPlaying = false;  // 重置播放状态

              // 停止视频播放
              if (videoRef.current) {
                videoRef.current.pause();
              }
              setShowVideo(false);
              
              // 先移除事件监听器，防止重复触发
              audio.oncanplaythrough = null;
              audio.onended = null;
              audio.onerror = null;
              
              stopSpeech();
              URL.revokeObjectURL(audioUrl);
              audio.remove();
              resolve();
            };

            audio.onerror = (error) => {
              console.error('音频错误:', error);
              isPlaying = false;  // 重置播放状态
              
              // 同样移除事件监听器
              audio.oncanplaythrough = null;
              audio.onended = null;
              audio.onerror = null;
              
              stopSpeech();
              URL.revokeObjectURL(audioUrl);
              audio.remove();
              reject(error);
            };

            audio.src = audioUrl;
          });
        } else {
          throw new Error(data.message || '服务器返回了无效的响应');
        }
      } else {
        // 使用原有的 ElevenLabs TTS 服务
        const client = new ElevenLabsClient({
          apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
        });
        
        audioStream = await client.textToSpeech.convert(
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
      }

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

      if (currentLanguage === LANGUAGES.ZH) {
        // 字节跳动 TTS 返回的是直接的音频 URL
        audio.src = audioStream.data;
      } else {
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
      }

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
      console.error('TTS 错误:', error);
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
      e.preventDefault(); // 防止换行
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

  // 添加检查面板重叠的函数
  const checkPanelOverlap = useCallback(() => {
    // 如果是手动切换，则跳过自动检查
    if (isManualToggle) return;

    if (!mainContentRef.current || !historyPanelRef.current) return;

    const mainContent = mainContentRef.current.getBoundingClientRect();
    const historyPanel = historyPanelRef.current.getBoundingClientRect();

    // 只检查重叠 - 如果空间不够就起
    const overlap = mainContent.left - (historyPanel.left + historyPanel.width) < 20;
    if (overlap && isHistoryPanelOpen) {
      setIsHistoryPanelOpen(false);
    }
  }, [isHistoryPanelOpen, isManualToggle]);

  // 更新切换按钮的点击处理函数
  const handlePanelToggle = () => {
    setIsHistoryPanelOpen(!isHistoryPanelOpen);
    setIsManualToggle(true);

    // 清除之前的定时器
    if (manualToggleTimeoutRef.current) {
      clearTimeout(manualToggleTimeoutRef.current);
    }

    // 设置新的定时器，1秒后重新启用自动
    manualToggleTimeoutRef.current = setTimeout(() => {
      setIsManualToggle(false);
    }, 1000);
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

  // 添加语言切换处理函数
  const toggleLanguage = () => {
    setCurrentLanguage(prev => prev === LANGUAGES.EN ? LANGUAGES.ZH : LANGUAGES.EN);
  };

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
              <h3 className="font-medium text-white/90">{CONTENT[currentLanguage].chatHistory.title}</h3>
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
                <p className="text-sm font-medium">{CONTENT[currentLanguage].chatHistory.empty.title}</p>
                <p className="text-xs mt-1">{CONTENT[currentLanguage].chatHistory.empty.subtitle}</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {chatHistory.map((message, index) => (
                  <div 
                    key={index} 
                    className={`mb-4 ${message.type === 'user' ? 'text-blue-300' : 'text-green-300'}`}
                  >
                    <div className="text-sm opacity-70 mb-1 font-medium">
                      {message.type === 'user' ? CONTENT[currentLanguage].chatHistory.you : CONTENT[currentLanguage].chatHistory.assistant}:
                    </div>
                    <div className="text-white/80 bg-white/5 rounded-lg p-3 text-sm">
                      {message.content}
                      {message.type === 'ai' && message.bulletPoints && message.bulletPoints.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-indigo-300">{CONTENT[currentLanguage].chatHistory.keyPoints}</p>
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
                          <p className="text-indigo-300 mb-2">{CONTENT[currentLanguage].chatHistory.videoRecommendation}</p>
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
                            {CONTENT[currentLanguage].chatHistory.openVideo}
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
                {CONTENT[currentLanguage].greeting}
              </span>
            </h1>
            
            <div className="relative">
              <div className="flex items-center justify-center space-x-3 text-xl text-white/80">
                <span className={styles['typing-text']}>{CONTENT[currentLanguage].iAm}</span>
                <div className={styles['dynamic-text']}>
                  {CONTENT[currentLanguage].roles.map((role, index) => (
                    <span key={index}>{role}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* 添加语言切换器和语言偏好提示 */}
            <div className="flex items-center justify-center gap-4 mt-2">
              <span className="text-sm text-white/70">
                {CONTENT[currentLanguage].preferredLanguage}
              </span>
              <button
                onClick={toggleLanguage}
                className="group relative flex items-center gap-2 px-4 py-2 bg-white/10 
                          hover:bg-white/15 backdrop-blur-md rounded-full border border-white/20 
                          text-white/90 hover:text-white transition-all duration-300"
              >
                <span className={`text-sm font-medium transition-all duration-300 
                  ${currentLanguage === LANGUAGES.EN ? 'opacity-100' : 'opacity-50'}`}>
                  English
                </span>
                <div className={`w-8 h-5 flex items-center bg-indigo-500/30 rounded-full p-1 transition-all duration-300
                  ${currentLanguage === LANGUAGES.ZH ? 'bg-indigo-500' : ''}`}>
                  <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-300
                    ${currentLanguage === LANGUAGES.ZH ? 'translate-x-3' : ''}`} />
                </div>
                <span className={`text-sm font-medium transition-all duration-300
                  ${currentLanguage === LANGUAGES.ZH ? 'opacity-100' : 'opacity-50'}`}>
                  中文
                </span>
              </button>
            </div>

            <p className="text-lg text-white/70 max-w-xl mx-auto leading-relaxed backdrop-blur-sm py-2">
              {CONTENT[currentLanguage].description}
            </p>
          </div>

          {/* Avatar 部分 */}
          <div className={`${styles['avatar-container']} ${isExpanded ? '' : styles['avatar-contracted']}`}>
            <div className={`relative ${isExpanded ? 'w-64 h-64' : 'w-48 h-48'} transition-all duration-500 
              ${!isExpanded ? '-translate-x-20' : ''}`}>
              {!showVideo ? (
                <img
                  src="/images/zhuyue.png"
                  alt="Digital Avatar"
                  className="w-full h-full rounded-full border-4 border-indigo-300/50 backdrop-blur-sm transition-all duration-500"
                />
              ) : (
                <video
                  ref={videoRef}
                  src="/images/zhuyue-lipmoving.mp4"
                  className={`absolute inset-0 w-full h-full rounded-full border-4 border-indigo-300/50 backdrop-blur-sm transition-all duration-500 ease-in-out ${
                    showVideo ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
                  }`}
                  style={{
                    transform: showVideo ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                    objectFit: 'cover'
                  }}
                  loop
                  muted
                  playsInline
                  onError={(e) => {
                    console.error('视频加载错误:', e);
                    setShowVideo(false);
                  }}
                />
              )}
              {floatingTags.map(tag => (
                <div key={tag.id} style={tag.style} className="transform">
                  {tag.text}
                </div>
              ))}
            </div>
          </div>

          {/* 输入控制区域 */}
          <div className="w-full">
            <div className="relative">
              <input
                type="text"
                value={userInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={processingState !== 'idle'}
                className={`w-full px-6 py-4 rounded-2xl bg-white/10 border 
                          ${isOverLimit ? 'border-red-500' : 'border-indigo-300/30'}
                          text-white backdrop-blur-md focus:ring-2 
                          ${isOverLimit ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}
                          focus:border-transparent transition-all duration-300 
                          pr-24
                          ${processingState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={CONTENT[currentLanguage].inputPlaceholder}
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
                <span>{CONTENT[currentLanguage].characterLimit}</span>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSubmit}
                disabled={processingState !== 'idle' || !userInput.trim() || isOverLimit}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 
                          hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl
                          transform hover:scale-105 transition-all duration-300 
                          disabled:opacity-50 disabled:hover:scale-100 shadow-lg 
                          shadow-indigo-500/30 font-medium"
              >
                {processingState === 'thinking' ? (
                  <span className="flex items-center justify-center">
                    {CONTENT[currentLanguage].thinkingStatus}
                    <span className="ml-2 animate-pulse">...</span>
                  </span>
                ) : processingState === 'answering' ? (
                  <span className="flex items-center justify-center">
                    {CONTENT[currentLanguage].answeringStatus}
                    <span className="ml-2 animate-pulse">...</span>
                  </span>
                ) : CONTENT[currentLanguage].sendButton}
              </button>
              
              {isSpeaking && (
                <button
                  onClick={stopSpeech}
                  className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 
                            hover:from-red-600 hover:to-pink-600 text-white rounded-xl
                            transform hover:scale-105 transition-all duration-300 font-medium"
                >
                  {CONTENT[currentLanguage].stopButton}
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
      <PhotoWall />
    </>
  );
};

export default HeroSectionRealtimeDemo;