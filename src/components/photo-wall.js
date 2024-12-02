'use client';
import React, { useState, useEffect } from 'react';
import styles from './photo-wall.module.css';

const PhotoWall = () => {
  const [cards, setCards] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    fetch('/data/cards.json')
      .then(response => response.json())
      .then(data => setCards(data))
      .catch(error => console.error('Error loading cards:', error));
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
    <div className={styles.photoWall}>
      <h2 className={styles.sectionTitle}>My Previous Experience</h2>
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
            onClick={() => setSelectedCard(card)}
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
  );
};

export default PhotoWall; 