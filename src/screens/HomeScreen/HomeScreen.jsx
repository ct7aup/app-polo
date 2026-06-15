// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { Alert, View } from 'react-native'
import { AnimatedFAB, Menu, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { addNewOperation, selectOperationIdsInFolder } from '../../store/operations'
import { selectSettings } from '../../store/settings'
import OperationItem from './components/OperationItem'
import HomeTools from './components/HomeTools'
import FolderItem from './components/FolderItem'
import { trackEvent } from '../../distro'
import { FlashList } from '@shopify/flash-list'
import { useIsFocused } from '@react-navigation/native'
import { useSelectorConditionally } from '../components/useConditionally'
import {
  selectFoldersList,
  selectFolderBreadcrumbs,
  selectCurrentFolderUuid,
  createFolder,
  renameFolder,
  deleteFolder,
  moveOperationToFolder
} from '../../store/folders'
import { foldersActions } from '../../store/folders'

export default function HomeScreen ({ navigation }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const safeArea = useSafeAreaInsets()

  const styles = useThemedStyles(prepareStyles, { safeArea })

  const isFocused = useIsFocused()
  const settings = useSelectorConditionally(isFocused, selectSettings)

  const currentFolderUuid = useSelector(selectCurrentFolderUuid)
  const subFolders = useSelector((state) => selectFoldersList(state, currentFolderUuid))
  const breadcrumbs = useSelector((state) => selectFolderBreadcrumbs(state, currentFolderUuid))
  const operationIds = useSelector((state) => selectOperationIdsInFolder(state, currentFolderUuid))

  const [fabMenuVisible, setFabMenuVisible] = useState(false)
  const [folderMenuVisible, setFolderMenuVisible] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [opMenuVisible, setOpMenuVisible] = useState(false)
  const [selectedOpId, setSelectedOpId] = useState(null)

  useEffect(() => {
    if (!settings?.operatorCall) {
      setTimeout(() => {
        navigation.navigate('Settings')
      }, 500)
    }
  }, [settings, navigation])

  useEffect(() => {
    navigation.setOptions({
      rightAction: 'cog',
      rightA11yLabel: t('screens.home.settings-a11y', 'screens.home.settings', 'Settings'),
      onRightActionPress: () => navigation.navigate('Settings'),
      leftAction: 'logo'
    })
  }, [navigation, t])

  const handleNewOperation = useCallback(async () => {
    setFabMenuVisible(false)
    const operation = await dispatch(addNewOperation({ _useTemplates: true, folderUuid: currentFolderUuid }))
    trackEvent('operation_created')
    navigation.navigate('Operation', { uuid: operation.uuid, operation, _isNew: true })
  }, [dispatch, navigation, currentFolderUuid])

  const handleNewFolder = useCallback(() => {
    setFabMenuVisible(false)
    Alert.prompt(
      t('screens.home.newFolder', 'New Folder'),
      t('screens.home.newFolderName', 'Folder name:'),
      (title) => {
        if (title?.trim()) {
          dispatch(createFolder({ title: title.trim(), parentUuid: currentFolderUuid }))
        }
      },
      'plain-text'
    )
  }, [dispatch, currentFolderUuid, t])

  const navigateToOperation = useCallback((operation) => {
    navigation.navigate('Operation', { uuid: operation.uuid, operation })
  }, [navigation])

  const navigateToFolder = useCallback((folder) => {
    dispatch(foldersActions.setCurrentFolderUuid(folder.uuid))
  }, [dispatch])

  const navigateUp = useCallback(() => {
    if (breadcrumbs.length > 0) {
      const parent = breadcrumbs[breadcrumbs.length - 2]
      dispatch(foldersActions.setCurrentFolderUuid(parent?.uuid ?? null))
    } else {
      dispatch(foldersActions.setCurrentFolderUuid(null))
    }
  }, [dispatch, breadcrumbs])

  const handleFolderLongPress = useCallback((folder) => {
    setSelectedFolder(folder)
    setFolderMenuVisible(true)
  }, [])

  const handleRenameFolder = useCallback(() => {
    setFolderMenuVisible(false)
    if (!selectedFolder) return
    Alert.prompt(
      t('screens.home.renameFolder', 'Rename Folder'),
      '',
      (title) => {
        if (title?.trim()) {
          dispatch(renameFolder({ uuid: selectedFolder.uuid, title: title.trim() }))
        }
      },
      'plain-text',
      selectedFolder.title
    )
  }, [dispatch, selectedFolder, t])

  const handleDeleteFolder = useCallback(() => {
    setFolderMenuVisible(false)
    if (!selectedFolder) return
    Alert.alert(
      t('screens.home.deleteFolder', 'Delete Folder'),
      t('screens.home.deleteFolderConfirm', 'Move contents to root and delete folder?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: () => dispatch(deleteFolder({ uuid: selectedFolder.uuid, moveContentsToRoot: true }))
        }
      ]
    )
  }, [dispatch, selectedFolder, t])

  const handleOperationLongPress = useCallback((operation) => {
    setSelectedOpId(operation.uuid)
    setOpMenuVisible(true)
  }, [])

  const handleMoveToRoot = useCallback(() => {
    setOpMenuVisible(false)
    if (selectedOpId) {
      dispatch(moveOperationToFolder({ operationUuid: selectedOpId, folderUuid: null }))
    }
  }, [dispatch, selectedOpId])

  const renderRow = useCallback(({ item }) => {
    if (item.__type === 'folder') {
      return (
        <FolderItem
          key={item.uuid}
          folder={item}
          styles={styles}
          style={{ paddingLeft: safeArea.left, paddingRight: safeArea.right }}
          onPress={navigateToFolder}
          onLongPress={handleFolderLongPress}
        />
      )
    }
    return (
      <OperationItem
        key={item}
        operationId={item}
        settings={settings}
        styles={styles}
        style={{ paddingLeft: safeArea.left, paddingRight: safeArea.right }}
        onPress={navigateToOperation}
        onLongPress={handleOperationLongPress}
      />
    )
  }, [navigateToOperation, navigateToFolder, handleFolderLongPress, handleOperationLongPress, styles, settings, safeArea])

  const listData = useMemo(() => {
    const folderItems = subFolders.map(f => ({ ...f, __type: 'folder' }))
    const opItems = operationIds
    return [...folderItems, ...opItems]
  }, [subFolders, operationIds])

  const [isExtended, setIsExtended] = React.useState(true)

  const handleScroll = useCallback(({ nativeEvent }) => {
    const currentScrollPosition = Math.floor(nativeEvent?.contentOffset?.y) ?? 0
    setIsExtended(currentScrollPosition <= styles.oneSpace * 8)
  }, [styles.oneSpace])

  const emptyListComponent = useMemo(() => <EmptyListComponent styles={styles} />, [styles])

  return (
    <ScreenContainer>
      <View style={styles.root}>
        {currentFolderUuid && (
          <BreadcrumbBar breadcrumbs={breadcrumbs} onBack={navigateUp} styles={styles} />
        )}
        <FlashList
          accesibilityLabel={t('screens.home.operationList-a11y', 'screens.home.operationList', 'Operation List')}
          style={styles.list}
          data={listData}
          renderItem={renderRow}
          ListEmptyComponent={emptyListComponent}
          keyboardShouldPersistTaps={'handled'}
          onScroll={handleScroll}
          getItemType={(item) => (item.__type === 'folder' ? 'folder' : 'operation')}
          keyExtractor={(item) => (item.__type === 'folder' ? `folder-${item.uuid}` : item)}
        />

        <Menu
          visible={fabMenuVisible}
          onDismiss={() => setFabMenuVisible(false)}
          anchor={
            <AnimatedFAB
              icon="plus"
              label={t('screens.home.newOperation', 'New Operation')}
              accessibilityLabel={t('screens.home.newOperation-a11y', 'screens.home.newOperation', 'New Operation')}
              mode="elevated"
              extended={isExtended}
              style={styles.fab}
              onPress={handleNewOperation}
              onLongPress={() => setFabMenuVisible(true)}
            />
          }
        >
          <Menu.Item onPress={handleNewOperation} title={t('screens.home.newOperation', 'New Log')} leadingIcon="radio-handheld" />
          <Menu.Item onPress={handleNewFolder} title={t('screens.home.newFolder', 'New Folder')} leadingIcon="folder-plus" />
        </Menu>

        <Menu visible={folderMenuVisible} onDismiss={() => setFolderMenuVisible(false)} anchor={<View />}>
          <Menu.Item onPress={handleRenameFolder} title={t('screens.home.renameFolder', 'Rename')} leadingIcon="pencil" />
          <Menu.Item onPress={handleDeleteFolder} title={t('screens.home.deleteFolder', 'Delete Folder')} leadingIcon="folder-remove" />
        </Menu>

        <Menu visible={opMenuVisible} onDismiss={() => setOpMenuVisible(false)} anchor={<View />}>
          <Menu.Item onPress={handleMoveToRoot} title={t('screens.home.moveToRoot', 'Move to Root')} leadingIcon="folder-move" />
        </Menu>
      </View>

      <HomeTools settings={settings} styles={styles} />
    </ScreenContainer>
  )
}

function BreadcrumbBar ({ breadcrumbs, onBack, styles }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: styles.oneSpace * 2, paddingVertical: styles.oneSpace }}>
      <Text onPress={onBack} style={{ color: styles.colors?.primary, marginRight: styles.oneSpace }}>{'← '}</Text>
      {breadcrumbs.map((crumb, i) => (
        <Text key={crumb.uuid} style={[styles.rowTextSmall, { fontWeight: i === breadcrumbs.length - 1 ? 'bold' : 'normal' }]}>
          {i > 0 ? ' / ' : ''}{crumb.title}
        </Text>
      ))}
    </View>
  )
}

const EmptyListComponent = ({ styles }) => {
  const { t } = useTranslation()

  return (
    <View style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>
      <Text style={{ textAlign: 'center' }}>{t('screens.home.noOperations', 'No Operations!')}</Text>
    </View>
  )
}

function prepareStyles (baseStyles, { safeArea }) {
  const DEBUG = false

  return {
    ...baseStyles,
    root: {
      flex: 1,
      width: '100%',
      padding: 0,
      margin: 0
    },
    list: {
      flex: 1
    },
    fab: {
      ...(baseStyles.isAndroid ? { position: 'absolute' } : {}),
      right: Math.max(baseStyles.oneSpace * 2, safeArea.right),
      bottom: Math.max(baseStyles.oneSpace * 2, safeArea.bottom)
    },
    row: {
      ...baseStyles.row,
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: baseStyles.oneSpace,
      paddingTop: baseStyles.oneSpace * 1.5
    },
    rowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: baseStyles.oneSpace
    },
    rowBottom: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: baseStyles.oneSpace
    },
    rowTopLeft: {
      borderWidth: DEBUG ? 1 : undefined,
      borderColor: DEBUG ? 'blue' : undefined,
      flex: 1
    },
    rowTopRight: {
      borderWidth: DEBUG ? 1 : undefined,
      borderColor: DEBUG ? 'blue' : undefined,
      flex: 0
    },
    rowBottomLeft: {
      borderWidth: DEBUG ? 1 : undefined,
      borderColor: DEBUG ? 'blue' : undefined,
      flex: 1
    },
    rowBottomRight: {
      borderWidth: DEBUG ? 1 : undefined,
      borderColor: DEBUG ? 'blue' : undefined,
      flex: 0
    },
    countContainer: {
      backgroundColor: 'rgba(127,127,127,0.4)',
      borderWidth: 0,
      paddingRight: baseStyles.oneSpace * 0.8,
      paddingLeft: baseStyles.oneSpace * 0.8,
      marginTop: -baseStyles.oneSpace * 0.1,
      borderRadius: baseStyles.oneSpace * 1.5
    },
    rowText: {
      ...baseStyles.rowText,
      backgroundColor: DEBUG ? 'rgba(0,0,0,0.1)' : undefined,
      fontSize: baseStyles.normalFontSize,
      fontWeight: '600',
      lineHeight: baseStyles.normalFontSize * 1.3
    },
    countText: {
      ...baseStyles.rowText,
      fontSize: baseStyles.smallFontSize,
      lineHeight: baseStyles.smallFontSize * 1.3
    },
    rowTextSmall: {
      ...baseStyles.rowText,
      backgroundColor: DEBUG ? 'rgba(0,0,0,0.1)' : undefined,
      fontSize: baseStyles.smallFontSize,
      lineHeight: baseStyles.smallFontSize * 1.3
    },
    rowTextSmallBold: {
      ...baseStyles.rowText,
      backgroundColor: DEBUG ? 'rgba(0,0,0,0.1)' : undefined,
      fontSize: baseStyles.smallFontSize,
      fontWeight: 'bold',
      lineHeight: baseStyles.smallFontSize * 1.3
    },
    markdown: {
      ...baseStyles.markdown,
      body: {
        ...baseStyles.markdown.body,
        ellipsizeMode: 'tail',
        numberOfLines: 1,
        backgroundColor: DEBUG ? 'rgba(0,0,0,0.1)' : undefined
      },
      paragraph: { margin: 0, padding: 0, marginTop: 0, marginBottom: 0 }
    }
  }
}
