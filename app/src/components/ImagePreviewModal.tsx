import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { proxyImageUrl } from '../lib/images';
import { X } from 'lucide-react-native';

interface Props {
  open: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export default function ImagePreviewModal({ open, imageUrl, onClose }: Props) {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
          <X size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.imageContainer}>
          {imageUrl && !imgError ? (
            <Image
              source={{ uri: proxyImageUrl(imageUrl) || '' }}
              style={styles.image}
              resizeMode="contain"
              onError={() => {
                console.log('[ImagePreview] Failed to load:', imageUrl);
                setImgError(true);
              }}
            />
          ) : (
            <View style={[styles.errorPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
              <X size={48} color={colors.textMuted} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    padding: 10,
    zIndex: 10,
  },
  imageContainer: {
    width: '100%',
    maxWidth: 600,
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  errorPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
