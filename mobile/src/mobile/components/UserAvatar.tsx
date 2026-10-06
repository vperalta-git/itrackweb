import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../constants/theme';

type UserAvatarProps = {
  name: string;
  avatarUri?: string | null;
  size?: number;
  radius?: number;
  textSize?: number;
  style?: StyleProp<ViewStyle>;
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part.trim().charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'IT';

export function UserAvatar({
  name,
  avatarUri,
  size = 72,
  radius,
  textSize,
  style,
}: UserAvatarProps) {
  const theme = useTheme();
  const [hasImageError, setHasImageError] = useState(false);
  const resolvedRadius = radius ?? Math.round(size * 0.33);
  const resolvedTextSize = textSize ?? Math.round(size * 0.34);
  const initials = useMemo(() => getInitials(name), [name]);
  const shouldRenderImage = Boolean(avatarUri && !hasImageError);

  useEffect(() => {
    setHasImageError((current) => (current ? false : current));
  }, [avatarUri]);

  return (
    <View
      style={[
        styles.avatarWrap,
        {
          width: size,
          height: size,
          borderRadius: resolvedRadius,
          backgroundColor: theme.colors.primarySurface,
          borderColor: theme.colors.primarySurfaceStrong,
        },
        style,
      ]}
    >
      {shouldRenderImage ? (
        <Image
          source={{ uri: avatarUri! }}
          style={[
            styles.avatarImage,
            {
              width: size,
              height: size,
              borderRadius: resolvedRadius,
            },
          ]}
          resizeMode="cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <Text
          style={[
            styles.avatarText,
            {
              fontSize: resolvedTextSize,
              color: theme.colors.primaryDark,
              fontFamily: theme.fonts.family.sans,
            },
          ]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontWeight: '700',
  },
});
