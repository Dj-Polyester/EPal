import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

interface Props {
  color: string;
}

export default function TypingIndicator({ color }: Props) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    };

    const anims = [animate(dot1, 0), animate(dot2, 150), animate(dot3, 300)];
    anims.forEach((a) => a.start());

    return () => {
      anims.forEach((a) => a.stop());
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, transform: [{ translateY: dot3 }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 4, paddingHorizontal: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
