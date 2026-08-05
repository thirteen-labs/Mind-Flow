import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/constants/theme';
import { ModalHeader } from './modal-header';

export type ModalVariant = 'dialog' | 'bottomSheet' | 'fullScreen';

export interface CustomModalProps {
  visible: boolean;
  onClose?: () => void;
  onDismiss?: () => void;
  children: React.ReactNode;
  variant?: ModalVariant | 'fullscreen' | 'sheet';
  dismissable?: boolean;
  contentStyle?: ViewStyle;
  animationDuration?: number;
  onShow?: () => void;
  onHide?: () => void;
  title?: string;
  showCloseButton?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function CustomModal({
  visible,
  onClose,
  onDismiss,
  children,
  variant = 'dialog',
  dismissable = true,
  contentStyle,
  animationDuration = 250,
  onShow,
  onHide,
  title,
  showCloseButton = false,
}: CustomModalProps) {
  const theme = useTheme();
  const handleClose = useMemo(() => onClose ?? onDismiss ?? (() => {}), [onClose, onDismiss]);
  const resolvedVariant =
    variant === 'fullscreen' ? 'fullScreen' : variant === 'sheet' ? 'bottomSheet' : variant;

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      if (isVisible) {
        const finish = () => {
          setIsVisible(false);
          onHide?.();
        };
        if (resolvedVariant === 'bottomSheet') {
          opacity.value = withTiming(0, { duration: animationDuration * 0.8 });
          translateY.value = withTiming(SCREEN_HEIGHT, { duration: animationDuration * 0.8 }, finish);
        } else {
          opacity.value = withTiming(0, { duration: animationDuration * 0.7 });
          scale.value = withTiming(0.95, { duration: animationDuration * 0.7 }, finish);
        }
      }
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsVisible(true);
    opacity.value = 0;
    scale.value = 0.95;
    translateY.value = SCREEN_HEIGHT;
    if (resolvedVariant === 'bottomSheet') {
      opacity.value = withTiming(1, { duration: animationDuration });
      translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
    } else {
      opacity.value = withTiming(1, { duration: animationDuration });
      scale.value = withSpring(1, { damping: 15, stiffness: 100 });
    }
    onShow?.();
  }, [
    visible,
    isVisible,
    opacity,
    scale,
    translateY,
    resolvedVariant,
    animationDuration,
    onShow,
    onHide,
  ]);

  useEffect(() => {
    if (!isVisible) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dismissable) {
        handleClose();
      }
      return true;
    });
    return () => backHandler.remove();
  }, [isVisible, dismissable, handleClose]);

  const handleBackdropPress = () => {
    if (dismissable) {
      handleClose();
    }
  };

  const getContentContainerStyle = (): ViewStyle => {
    switch (resolvedVariant) {
      case 'dialog':
        return styles.dialogContainer;
      case 'bottomSheet':
        return styles.bottomSheetContainer;
      case 'fullScreen':
        return styles.fullScreenContainer;
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    if (resolvedVariant === 'bottomSheet') {
      return {
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
      };
    }
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  if (!visible && !isVisible) return null;

  return (
    <Modal
      visible={visible || isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissable ? handleClose : undefined}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.overlay,
            {
              backgroundColor:
                resolvedVariant === 'fullScreen' ? theme.background : withAlpha('#000000', 0.5),
            },
          ]}
        >
          <Pressable style={styles.backdrop} onPress={handleBackdropPress} />
          <Animated.View
            style={[
              getContentContainerStyle(),
              {
                backgroundColor:
                  resolvedVariant === 'fullScreen' ? theme.background : theme.surface,
              },
              animatedStyle,
              contentStyle,
            ]}
            onStartShouldSetResponder={() => true}
          >
            {resolvedVariant === 'bottomSheet' && !title && (
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: theme.textMuted }]} />
              </View>
            )}
            {title ? (
              <ModalHeader title={title} onClose={handleClose} showCloseButton={showCloseButton} />
            ) : null}
            {children}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogContainer: {
    width: '85%',
    maxWidth: 360,
    maxHeight: '85%',
    borderRadius: 20,
    paddingTop: 24,
    paddingBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '90%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  fullScreenContainer: {
    flex: 1,
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});
