import React, { useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme, useTheme } from '../constants/theme';

const MENU_WIDTH = 188;
const SCREEN_EDGE_OFFSET = 12;
const MENU_VERTICAL_OFFSET = 8;
const MENU_ITEM_HEIGHT = 46;
const MENU_VERTICAL_PADDING = 8;
const TRIGGER_SIZE = 44;
const TRIGGER_ICON_SIZE = 20;

export interface CardActionMenuItem {
  key: string;
  label: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  tone?: 'default' | 'destructive' | 'positive';
  accessibilityLabel?: string;
}

interface CardActionMenuProps {
  items: CardActionMenuItem[];
  accessibilityLabel?: string;
}

export function CardActionMenu({
  items,
  accessibilityLabel = 'Open card actions',
}: CardActionMenuProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const triggerRef = useRef<View>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState({
    left: SCREEN_EDGE_OFFSET,
    top: SCREEN_EDGE_OFFSET,
  });

  const estimatedMenuHeight =
    items.length * MENU_ITEM_HEIGHT +
    Math.max(items.length - 1, 0) +
    MENU_VERTICAL_PADDING * 2;

  const closeMenu = () => {
    setIsOpen(false);
  };

  const openMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) {
      setIsOpen(true);
      return;
    }

    trigger.measureInWindow((x, y, width, height) => {
      const left = Math.max(
        SCREEN_EDGE_OFFSET,
        Math.min(
          x + width - MENU_WIDTH,
          windowWidth - MENU_WIDTH - SCREEN_EDGE_OFFSET
        )
      );
      const top = Math.max(
        SCREEN_EDGE_OFFSET,
        Math.min(
          y + height + MENU_VERTICAL_OFFSET,
          windowHeight - estimatedMenuHeight - SCREEN_EDGE_OFFSET
        )
      );

      setAnchor({ left, top });
      setIsOpen(true);
    });
  };

  const handleTriggerPress = (event: GestureResponderEvent) => {
    event.stopPropagation();

    if (isOpen) {
      closeMenu();
      return;
    }

    openMenu();
  };

  const handleOverlayPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    closeMenu();
  };

  const handleItemPress = (
    event: GestureResponderEvent,
    item: CardActionMenuItem
  ) => {
    event.stopPropagation();
    closeMenu();
    item.onPress();
  };

  if (!items.length) {
    return null;
  }

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          activeOpacity={0.88}
          hitSlop={4}
          onPress={handleTriggerPress}
          style={[styles.trigger, isOpen ? styles.triggerActive : null]}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={TRIGGER_ICON_SIZE}
            color={theme.colors.textSubtle}
          />
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
        statusBarTranslucent
        visible={isOpen}
      >
        <Pressable style={styles.overlay} onPress={handleOverlayPress}>
          <Pressable
            style={[styles.menu, { left: anchor.left, top: anchor.top }]}
            onPress={(event) => event.stopPropagation()}
          >
            {items.map((item, index) => {
              const iconColor =
                item.tone === 'destructive'
                  ? theme.colors.error
                  : item.tone === 'positive'
                  ? theme.colors.success
                  : theme.colors.text;
              const labelColor =
                item.tone === 'destructive'
                  ? theme.colors.error
                  : item.tone === 'positive'
                  ? theme.colors.success
                  : theme.colors.text;

              return (
                <React.Fragment key={item.key}>
                  <TouchableOpacity
                    accessibilityLabel={item.accessibilityLabel ?? item.label}
                    accessibilityRole="button"
                    activeOpacity={0.88}
                    onPress={(event) => handleItemPress(event, item)}
                    style={styles.menuItem}
                  >
                    <Ionicons
                      name={item.iconName}
                      size={17}
                      color={iconColor}
                    />
                    <Text style={[styles.menuItemText, { color: labelColor }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>

                  {index < items.length - 1 ? (
                    <View style={styles.separator} />
                  ) : null}
                </React.Fragment>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    trigger: {
      width: TRIGGER_SIZE,
      height: TRIGGER_SIZE,
      borderRadius: theme.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    triggerActive: {
      backgroundColor: theme.colors.primarySurface,
      borderColor: theme.colors.primarySurfaceStrong,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    menu: {
      position: 'absolute',
      width: MENU_WIDTH,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      backgroundColor: theme.colors.surfaceRaised,
      paddingVertical: MENU_VERTICAL_PADDING,
      ...theme.shadows.lg,
    },
    menuItem: {
      minHeight: MENU_ITEM_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
    },
    menuItemText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      fontFamily: theme.fonts.family.sans,
    },
    separator: {
      height: 1,
      marginHorizontal: theme.spacing.base,
      backgroundColor: theme.colors.border,
    },
  });
