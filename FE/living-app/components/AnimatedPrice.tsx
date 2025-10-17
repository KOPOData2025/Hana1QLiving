import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';

interface AnimatedPriceProps {
  price: number;
  style?: any;
  formatFunction?: (price: number) => string;
  animationDuration?: number;
  flashColor?: string; // 플래시 색상 (선택사항)
}

export function AnimatedPrice({
  price,
  style,
  formatFunction = (price) => price.toString(),
  animationDuration = 300,
  flashColor
}: AnimatedPriceProps) {
  const [displayPrice, setDisplayPrice] = useState(price);
  const [isAnimating, setIsAnimating] = useState(false);
  const [previousPrice, setPreviousPrice] = useState(price);

  // 애니메이션 값들
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (price !== displayPrice && price !== 0) {
      setPreviousPrice(displayPrice);
      animateSlide();
    }
  }, [price]);

  const animateSlide = () => {
    if (isAnimating) return; // 이미 애니메이션 중이면 무시

    setIsAnimating(true);

    // 플래시 효과를 별도로 실행 (배경색은 네이티브 드라이버 사용 불가)
    if (flashColor) {
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false, // backgroundColor는 네이티브 드라이버 지원 안함
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }

    // 1. 현재 가격을 위로 슬라이드 아웃하면서 페이드 아웃
    // 2. 새 가격을 아래에서 슬라이드 인하면서 페이드 인
    Animated.parallel([
      // 현재 텍스트를 위로 슬라이드
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: animationDuration / 2,
        useNativeDriver: true,
      }),
      // 현재 텍스트 페이드 아웃
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: animationDuration / 2,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 애니메이션 중간에 실제 가격 업데이트
      setDisplayPrice(price);

      // 새 텍스트를 아래에서 시작
      slideAnim.setValue(30);

      // 새 텍스트를 원위치로 슬라이드하면서 페이드 인
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: animationDuration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: animationDuration / 2,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAnimating(false);
      });
    });
  };

  const backgroundColor = flashColor ?
    flashAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['transparent', flashColor],
    }) : 'transparent';

  return (
    <View style={styles.container}>
      {/* 플래시 효과용 배경 컨테이너 */}
      <Animated.View
        style={[
          styles.flashContainer,
          {
            backgroundColor: backgroundColor,
          },
        ]}
      >
        {/* 슬라이드 효과용 텍스트 컨테이너 */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={style}>
            {formatFunction(displayPrice)}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  flashContainer: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  textContainer: {
    alignItems: 'center',
  },
});