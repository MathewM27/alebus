import * as storage from '@/utils/storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

// Create animated SVG Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Theme colors
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const ACCENT = '#c1ec72';
const INACTIVE_DOT = '#E0E0E0';
const SKIP_TEXT = 'rgba(255, 255, 255, 0.7)';

// Responsive dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 420);
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.55, 220);
const ILLUSTRATION_SIZE = CIRCLE_SIZE * 0.85;

// Spacing scale
const SPACING = { xs: 6, sm: 8, md: 16, lg: 24, xl: 32 };

// Reusable shadow styles
const SHADOW_LIGHT = {
  shadowColor: BLACK,
  shadowOpacity: 0.15,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};
const SHADOW_MEDIUM = {
  shadowColor: BLACK,
  shadowOpacity: 0.25,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
};
const SHADOW_HEAVY = {
  shadowColor: BLACK,
  shadowOpacity: 0.3,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 10,
};

// Onboarding data
const ONBOARDING_DATA = [
  {
    key: '1',
    title: 'Track buses in\nreal time',
    bullets: [
      { icon: 'map-marker-radius', text: 'Real-time bus locations' },
      { icon: 'clock-outline', text: 'Live arrival estimates' },
    ],
    image: require('@/assets/images/onboarding11.png'),
  },
  {
    key: '2',
    title: 'Find the right bus\nfaster',
    bullets: [
      { icon: 'routes', text: 'Browse all available routes' },
      { icon: 'compare', text: 'Compare nearby options' },
      { icon: 'transit-connection-variant', text: 'Multi-journey planning' },
    ],
    image: require('@/assets/images/onboarding11.png'),
  },
  {
    key: '3',
    title: 'Travel smarter\nevery day',
    bullets: [
      { icon: 'timer-sand', text: 'Reduce waiting time' },
      { icon: 'lightning-bolt', text: 'Optimize your commute' },
      { icon: 'brain', text: 'Smart travel decisions' },
    ],
    image: require('@/assets/images/onboarding11.png'),
  },
];

// ─── Animated Pagination Dots ───────────────────────────────
function AnimatedDot({ active }: { active: boolean }) {
  const widthAnim = useRef(new Animated.Value(active ? 24 : 8)).current;
  const colorAnim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: active ? 24 : 8,
        friction: 8,
        tension: 60,
        useNativeDriver: false,
      }),
      Animated.timing(colorAnim, {
        toValue: active ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [active]);

  const bgColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [INACTIVE_DOT, BLACK],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: widthAnim,
          backgroundColor: bgColor,
        },
      ]}
    />
  );
}

function PaginationDots({ currentIndex }: { currentIndex: number }) {
  return (
    <View style={styles.dotsContainer}>
      {ONBOARDING_DATA.map((_, index) => (
        <AnimatedDot key={index} active={index === currentIndex} />
      ))}
    </View>
  );
}

// ─── Bullet List Component ──────────────────────────────────
interface BulletItem {
  icon: string;
  text: string;
}

function BulletList({ items }: { items: BulletItem[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, index) => (
        <View key={index} style={styles.bulletItem}>
          <MaterialCommunityIcons
            name={item.icon as any}
            size={20}
            color={BLACK}
            style={styles.bulletIcon}
          />
          <Text style={styles.bulletText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Slide Item (with scroll-driven parallax) ──────────────
interface SlideItemProps {
  item: (typeof ONBOARDING_DATA)[0];
  index: number;
  currentIndex: number;
  scrollX: Animated.Value;
}

function SlideItem({ item, index, currentIndex, scrollX }: SlideItemProps) {
  const inputRange = [
    (index - 1) * CARD_WIDTH,
    index * CARD_WIDTH,
    (index + 1) * CARD_WIDTH,
  ];

  // Parallax: image moves slower than scroll for depth
  const imageTranslateX = scrollX.interpolate({
    inputRange,
    outputRange: [40, 0, -40],
    extrapolate: 'clamp',
  });

  // Scale: slight scale down when off-center
  const imageScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.85, 1, 0.85],
    extrapolate: 'clamp',
  });

  // Text slides in from opposite direction for a reveal feel
  const textTranslateY = scrollX.interpolate({
    inputRange,
    outputRange: [30, 0, 30],
    extrapolate: 'clamp',
  });

  const textOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  // Circular progress: animate based on overall progress through all slides
  const totalSlides = ONBOARDING_DATA.length;
  const progressInputRange = ONBOARDING_DATA.map((_, i) => i * CARD_WIDTH);
  const progressOutputRange = ONBOARDING_DATA.map((_, i) => (i + 1) / totalSlides);

  const progress = scrollX.interpolate({
    inputRange: progressInputRange,
    outputRange: progressOutputRange,
    extrapolate: 'clamp',
  });

  // SVG circle parameters
  const radius = CIRCLE_SIZE / 2 + 8; // Slightly larger than the image circle
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  
  // Animate strokeDashoffset based on progress
  const strokeDashoffset = Animated.multiply(
    progress,
    circumference
  ).interpolate({
    inputRange: [0, circumference],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.slideContainer, { width: CARD_WIDTH }]}>
      {/* Illustration Circle with parallax and progress indicator */}
      <View style={styles.circleWrapper}>
        {/* SVG Progress Circle */}
        <Svg
          width={CIRCLE_SIZE + 24}
          height={CIRCLE_SIZE + 24}
          style={styles.progressCircle}
        >
          {/* Background circle (optional - shows the track) */}
          <Circle
            cx={(CIRCLE_SIZE + 24) / 2}
            cy={(CIRCLE_SIZE + 24) / 2}
            r={radius}
            stroke="rgba(0, 0, 0, 0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={(CIRCLE_SIZE + 24) / 2}
            cy={(CIRCLE_SIZE + 24) / 2}
            r={radius}
            stroke={CARD_ACCENT}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${(CIRCLE_SIZE + 24) / 2}, ${(CIRCLE_SIZE + 24) / 2}`}
          />
        </Svg>
        
        {/* Image Circle */}
        <Animated.View
          style={[
            styles.circleContainer,
            {
              transform: [
                { translateX: imageTranslateX },
                { scale: imageScale },
              ],
            },
          ]}
        >
          <Image
            source={item.image}
            style={styles.illustration}
            contentFit="contain"
          />
        </Animated.View>
      </View>

      {/* Pagination Dots */}
      <PaginationDots currentIndex={currentIndex} />

      {/* Text Content with fade/slide */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.title}>{item.title}</Text>
        <BulletList items={item.bullets} />
      </Animated.View>
    </View>
  );
}

// ─── Bottom Controls (animated transitions) ────────────────
interface BottomControlsProps {
  currentIndex: number;
  onNext: () => void;
  onSkip: () => void;
  onStart: () => void;
}

function BottomControls({
  currentIndex,
  onNext,
  onSkip,
  onStart,
}: BottomControlsProps) {
  const isLastSlide = currentIndex === ONBOARDING_DATA.length - 1;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const transitionAnim = useRef(new Animated.Value(isLastSlide ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(transitionAnim, {
      toValue: isLastSlide ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isLastSlide]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    action();
  };

  // Crossfade: SKIP/NEXT fades out, START fades in
  const rowOpacity = transitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const startOpacity = transitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const startTranslateY = transitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  return (
    <View style={styles.bottomControlsContainer}>
      {/* SKIP / NEXT row */}
      <Animated.View
        style={[
          styles.controlsRow,
          {
            opacity: rowOpacity,
            position: isLastSlide ? 'absolute' : 'relative',
            // keep it in layout flow but invisible on last slide
          },
        ]}
        pointerEvents={isLastSlide ? 'none' : 'auto'}
      >
        <Pressable
          onPress={() => handleButtonPress(onSkip)}
          style={styles.skipButton}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skipText}>SKIP</Text>
        </Pressable>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => handleButtonPress(onNext)}
          accessibilityRole="button"
          accessibilityLabel="Next slide"
        >
          <Animated.View
            style={[
              styles.pillButton,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Text style={styles.pillButtonText}>NEXT</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>

      {/* START button */}
      <Animated.View
        style={[
          styles.startButtonContainer,
          {
            opacity: startOpacity,
            transform: [{ translateY: startTranslateY }],
            position: isLastSlide ? 'relative' : 'absolute',
          },
        ]}
        pointerEvents={isLastSlide ? 'auto' : 'none'}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => handleButtonPress(onStart)}
          accessibilityRole="button"
          accessibilityLabel="Start using the app"
          style={{ width: '100%' }}
        >
          <Animated.View
            style={[
              styles.pillButton,
              styles.startButton,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Text style={styles.pillButtonText}>START</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────
export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Mount entrance animation
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const newIndex = viewableItems[0].index;
        if (newIndex !== currentIndex) {
          // Light haptic feedback on slide change
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setCurrentIndex(newIndex);
        }
      }
    },
    [currentIndex]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = useCallback(() => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      // Subtle haptic on programmatic navigation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }, [currentIndex]);

  const completeOnboarding = useCallback(async () => {
    try {
      await storage.setOnboardingComplete(true);
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
    router.replace('/(boot)/register' as Href);
  }, []);

  const handleSkip = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const handleStart = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof ONBOARDING_DATA)[0]; index: number }) => (
      <SlideItem
        item={item}
        index={index}
        currentIndex={currentIndex}
        scrollX={scrollX}
      />
    ),
    [currentIndex, scrollX]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: CARD_WIDTH,
      offset: CARD_WIDTH * index,
      index,
    }),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" backgroundColor={BLACK} />
      <View style={styles.container}>
        {/* Logo positioned on top of card */}
        <Image
          source={require('@/assets/images/iconAle.svg')}
          style={styles.cardLogo}
          contentFit="contain"
        />
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <View style={styles.card}>
            <Animated.FlatList
              ref={flatListRef}
              data={ONBOARDING_DATA}
              renderItem={renderItem}
              keyExtractor={(item) => item.key}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              onViewableItemsChanged={handleViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              getItemLayout={getItemLayout}
              snapToInterval={CARD_WIDTH}
              decelerationRate="fast"
              snapToAlignment="center"
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
              onScrollBeginDrag={() => {
                // Very light haptic when user starts dragging
                Haptics.selectionAsync();
              }}
            />
          </View>
        </Animated.View>
        <BottomControls
          currentIndex={currentIndex}
          onNext={handleNext}
          onSkip={handleSkip}
          onStart={handleStart}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BLACK,
  },
  container: {
    flex: 1,
    backgroundColor: BLACK,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLogo: {
    width: 100,
    height: 100,
    position: 'absolute',
    top: 16,
   
    zIndex: 10,
  },
  cardWrapper: {
    flex: 1,
    width: CARD_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 120,
  },
  card: {
    width: CARD_WIDTH,
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 30,
    overflow: 'hidden',
    // iOS shadow
    shadowColor: BLACK,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    // Android elevation
    elevation: 6,
  },
  slideContainer: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  circleWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressCircle: {
    position: 'absolute',
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: CIRCLE_BG,
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow for 3D effect
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    // Android elevation for 3D effect
    elevation: 10,
  },
  illustration: {
    width: CIRCLE_SIZE * 0.85,
    height: CIRCLE_SIZE * 0.85,
    borderRadius: (CIRCLE_SIZE * 0.85) / 2,
    overflow: 'hidden',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: TEXT_COLOR,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 20,
  },
  bulletList: {
    gap: 12,
    alignItems: 'center',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulletIcon: {
    marginRight: 0,
    marginTop: 0,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 14,
    color: TEXT_COLOR,
    fontWeight: '500',
    lineHeight: 20,
    flexWrap: 'wrap',
    textAlign: 'center',
    maxWidth: 200,
  },
  bottomControlsContainer: {
    width: '100%',
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: SKIP_TEXT,
    letterSpacing: 0.5,
  },
  pillButton: {
    height: 50,
    paddingHorizontal: 32,
    backgroundColor: ACCENT,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow
    shadowColor: BLACK,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    // Android elevation
    elevation: 8,
  },
  pillButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: BLACK,
    letterSpacing: 0.5,
  },
  startButtonContainer: {
    alignItems: 'center',
    width: '100%',
  },
  startButton: {
    width: '100%',
  },
});
