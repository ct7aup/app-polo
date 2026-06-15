// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

export default function FolderItem ({ folder, styles, style, onPress, onLongPress }) {
  const handlePress = useCallback(() => onPress && onPress(folder), [folder, onPress])
  const handleLongPress = useCallback(() => onLongPress && onLongPress(folder), [folder, onLongPress])

  return (
    <TouchableOpacity onPress={handlePress} onLongPress={handleLongPress} style={[styles.row, style]}>
      <View style={styles.rowTop}>
        <View style={[styles.rowTopLeft, { flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace }]}>
          <Icon source="folder" size={styles.normalFontSize * 1.5} />
          <Text style={styles.rowText}>{folder.title}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
