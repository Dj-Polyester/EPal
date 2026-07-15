import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { proxyImageUrl } from '../lib/images';
import { X, User } from 'lucide-react-native';

interface Props {
  open: boolean;
  onClose: () => void;
  name: string;
  avatarUrl: string | null;
  personality: string | null;
}

export default function CharacterDetailModal({ open, onClose, name, avatarUrl, personality }: Props) {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.imageArea, { backgroundColor: colors.primaryLight }]}>
            {avatarUrl && !imgError ? (
              <Image
                source={{ uri: proxyImageUrl(avatarUrl) || '' }}
                style={styles.image}
                resizeMode="cover"
                onError={() => {
                  console.log('[DetailModal] Avatar failed to load:', avatarUrl);
                  setImgError(true);
                }}
              />
            ) : (
              <User size={64} color={colors.primary} />
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>ABOUT</Text>
            <Text style={[styles.personality, { color: colors.text }]}>
              {personality || 'No description available.'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageArea: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: { width: '100%', height: 240 },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 6,
  },
  content: { padding: 20 },
  name: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  divider: { height: 1, marginBottom: 12 },
  aboutLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  personality: { fontSize: 14, lineHeight: 20 },
});
