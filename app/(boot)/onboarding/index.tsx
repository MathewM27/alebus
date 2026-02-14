import * as storage from '@/utils/storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Theme colors
const BLACK = '#000000';
const CARD_BG = '#0E0E10';
const CIRCLE_BG = '#141416';
const ACCENT = '#c1ec72';
const INACTIVE_DOT = '#444444';
const MUTED_TEXT = 'rgba(255, 255, 255, 0.65)';
const SKIP_TEXT = 'rgba(255, 255, 255, 0.7)';

// Responsive dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 420);
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.65, 280);

// Onboarding data
const ONBOARDING_DATA = [
  {
    key: '1',
    title: 'Track buses in\nreal time',
    subtitle: 'See live bus locations, arrival estimates, and routes moving toward your destination so you can plan with confidence.',
    image: require('@/assets/images/onboarding11.png'),
  },
  {
    key: '2',
    title: 'Find the right bus\nfaster',
    subtitle: 'Discover buses going your way, compare nearby routes, and choose the best option based on direction and arrival time.',
    image: require('@/assets/images/onboarding11.png'),
  },
  {
    key: '3',
    title: 'Travel smarter\nevery day',
    subtitle: 'Reduce waiting time, avoid uncertainty, and make better commuting decisions with live updates and smart journey insights.',
    image: require('@/assets/images/onboarding11.png'),
  },
];

// Pagination Dots Component
function PaginationDots({ currentIndex }: { currentIndex: number }) {
  return (
    <View style={styles.dotsContainer}>
      {ONBOARDING_DATA.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index === currentIndex ? ACCENT : INACTIVE_DOT,
            },
          ]}
        />
      ))}
    </View>
  );
}

// Slide Item Component
interface SlideItemProps {
  item: (typeof ONBOARDING_DATA)[0];
  currentIndex: number;
}

function SlideItem({ item, currentIndex }: SlideItemProps) {
  return (
    <View style={[styles.slideContainer, { width: CARD_WIDTH }]}>
      {/* Illustration Circle */}
      <View style={styles.circleContainer}>
        <Image
          source={item.image}
          style={styles.illustration}
          contentFit="contain"
        />
      </View>

      {/* Pagination Dots */}
      <PaginationDots currentIndex={currentIndex} />

      {/* Text Content */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );
}

// Bottom Controls Component
interface BottomControlsProps {
  currentIndex: number;
  onNext: () => void;
  onSkip: () => void;
  onStart: () => void;
}

function BottomControls({ currentIndex, onNext, onSkip, onStart }: BottomControlsProps) {
  const isLastSlide = currentIndex === ONBOARDING_DATA.length - 1;
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  return (
    <View style={styles.bottomControlsContainer}>
      {!isLastSlide ? (
        <View style={styles.controlsRow}>
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
        </View>
      ) : (
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => handleButtonPress(onStart)}
          style={styles.startButtonContainer}
          accessibilityRole="button"
          accessibilityLabel="Start using the app"
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
      )}
    </View>
  );
}

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = useCallback(() => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
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
    ({ item }: { item: (typeof ONBOARDING_DATA)[0] }) => (
      <SlideItem
        item={item}
        currentIndex={currentIndex}
      />
    ),
    [currentIndex]
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
        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            <FlatList
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
            />
          </View>
        </View>
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
  cardWrapper: {
    flex: 1,
    width: CARD_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: '85%',
    backgroundColor: CARD_BG,
    borderRadius: 30,
    overflow: 'hidden',
    // iOS shadow
    shadowColor: BLACK,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    // Android elevation
    elevation: 12,
  },
  slideContainer: {
    flex: 1,
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: CIRCLE_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    width: 8,
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
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: MUTED_TEXT,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomControlsContainer: {
    width: '100%',
    paddingHorizontal: 32,
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
