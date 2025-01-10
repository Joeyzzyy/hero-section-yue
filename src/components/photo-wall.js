'use client';
import React, { useState, useEffect, useRef } from 'react';
import styles from './photo-wall.module.css';
import { ElevenLabsClient } from "elevenlabs";
import PropTypes from 'prop-types';

const PhotoWall = ({ onTTSStateChange }) => {
  const [cards, setCards] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 初始化 ElevenLabs 客户端
  const elevenLabs = new ElevenLabsClient({
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
  });

  // 添加日志来检查 API Key
  useEffect(() => {
    console.log('ElevenLabs API Key:', process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY);
  }, []);

  useEffect(() => {
    fetch('/data/cards.json')
      .then(response => response.json())
      .then(data => setCards(data))
      .catch(error => console.error('Error loading cards:', error));
  }, []);

  // 处理 TTS 转换和播放
  const handleTTS = async (text) => {
    console.log('Starting TTS for text:', text);
    try {
      setIsSpeaking(true);

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

      // 通知父组件展示和播放视频
      onTTSStateChange?.({ show: true, play: true, speaking: true });

      // 创建和播放音频
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
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // 设置音频事件监听器
      audio.onended = () => {
        onTTSStateChange?.({ show: false, play: false, speaking: false });
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();

    } catch (error) {
      console.error('TTS processing failed:', error);
      onTTSStateChange?.({ show: false, play: false, speaking: false });
      setIsSpeaking(false);
    }
  };

  // 添加 useEffect 来监听 showVideo 状态变化
  useEffect(() => {
    if (showVideo && videoRef.current) {
      videoRef.current.play().catch(error => {
        console.error('视频播放失败:', error);
      });
    }
  }, [showVideo]);

  // 处理卡片选择
  const handleCardSelect = async (card) => {
    setSelectedCard(card);
    setIsTyping(true);
    setDisplayText('');
    
    // 使用 card.description 进行 TTS
    handleTTS(card.description);
    
    // 清理之前可能存在的 interval
    if (window.typingInterval) {
      clearInterval(window.typingInterval);
    }
    
    let currentText = '';
    const text = card.details;
    // 将 interval 保存到全局变量中，以便后续清理
    window.typingInterval = setInterval(() => {
      if (currentText.length < text.length) {
        currentText = text.substring(0, currentText.length + 1);
        setDisplayText(currentText);
      } else {
        setIsTyping(false);
        clearInterval(window.typingInterval);
        window.typingInterval = null;
      }
    }, 30);
  };

  // 处理弹窗关闭
  const handleCloseModal = () => {
    // 清理打字机效果
    if (window.typingInterval) {
      clearInterval(window.typingInterval);
      window.typingInterval = null;
    }
    
    // 停止音频播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // 停止视频播放并切换回图片
    setShowVideo(false);
    onTTSStateChange?.({ show: false, play: false, speaking: false });
    setIsSpeaking(false);
    setSelectedCard(null);
    setDisplayText('');
    setIsTyping(false);
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  // 计算对称的旋转和位移
  const calculateTransform = (index, isHovered) => {
    const totalCards = 4;
    const totalAngle = 90; // 从 120 减小到 90，减少倾斜角度
    const angleStep = totalAngle / (totalCards - 1);
    const startAngle = -totalAngle / 2;
    const angle = startAngle + (angleStep * index);
    
    return isHovered 
      ? `rotate(${angle}deg) translateY(-40px)` 
      : `rotate(${angle}deg)`;
  };

  return (
    <>
      <div className={styles.photoWall}>
        <h2 className={styles.sectionTitle}>My Previous Experience</h2>
        {selectedCard && (
          <div className={styles.modalLocal}>
            <div 
              className={styles.modalContent}
            >
              <button
                className={styles.closeButton}
                onClick={handleCloseModal}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white">
                    <img 
                      src={selectedCard.image} 
                      alt={selectedCard.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white/90">
                      {selectedCard.title}
                    </h3>
                    <p className="text-sm text-white/60">
                      {selectedCard.time}
                    </p>
                  </div>
                </div>
                <div className={`relative overflow-hidden ${styles.description}`}>
                  <p className="text-white/80 whitespace-pre-line">
                    {displayText}
                    {isTyping && (
                      <span className="inline-block w-1 h-3 ml-1 bg-white/70 animate-pulse" />
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className={styles.cardStack}>
          {cards.map((card, index) => (
            <div
              key={card.id}
              className={styles.card}
              style={{
                transform: calculateTransform(index, hoveredCard === card.id),
                zIndex: hoveredCard === card.id ? 50 : cards.length - index,
              }}
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleCardSelect(card)}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardImage}>
                  <img src={card.image} alt={card.title} />
                </div>
                <div className={`${styles.cardContent} bg-gradient-to-br ${card.gradient}`}>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  {card.time && (
                    <p className={styles.cardTime}>{card.time}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// 添加 PropTypes 检查（可选但推荐）
PhotoWall.propTypes = {
  onTTSStateChange: PropTypes.func
};

export default PhotoWall; 