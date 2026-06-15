// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import UUID from 'react-native-uuid'
import { dbExecute, dbSelectAll } from '../../db/db'
import { actions as foldersActions } from '../foldersSlice'
import { actions as operationsActions } from '../../operations/operationsSlice'

export function loadFoldersFromDB (dbParams = {}) {
  return async (dispatch) => {
    const rows = await dbSelectAll('SELECT * FROM folders WHERE deleted = 0', [], dbParams)
    dispatch(foldersActions.setFolders(rows))
  }
}

export function createFolder ({ title, parentUuid = null }, dbParams = {}) {
  return async (dispatch) => {
    const uuid = UUID.v4()
    const now = Date.now()
    await dbExecute(
      'INSERT INTO folders (uuid, parentUuid, title, createdAtMillis, updatedAtMillis, deleted) VALUES (?, ?, ?, ?, ?, 0)',
      [uuid, parentUuid, title, now, now],
      dbParams
    )
    dispatch(foldersActions.setFolder({ uuid, parentUuid, title, createdAtMillis: now, updatedAtMillis: now, deleted: false }))
    return uuid
  }
}

export function renameFolder ({ uuid, title }, dbParams = {}) {
  return async (dispatch) => {
    const now = Date.now()
    await dbExecute('UPDATE folders SET title = ?, updatedAtMillis = ? WHERE uuid = ?', [title, now, uuid], dbParams)
    dispatch(foldersActions.setFolder({ uuid, title, updatedAtMillis: now }))
  }
}

export function deleteFolder ({ uuid, moveContentsToRoot = true }, dbParams = {}) {
  return async (dispatch, getState) => {
    const state = getState()
    const folders = state?.folders?.info ?? {}

    if (moveContentsToRoot) {
      await dbExecute('UPDATE operations SET folderUuid = NULL WHERE folderUuid = ?', [uuid], dbParams)
      await dbExecute('UPDATE folders SET parentUuid = NULL WHERE parentUuid = ?', [uuid], dbParams)

      const updatedOps = Object.values(state?.operations?.info ?? {})
        .filter(op => op?.folderUuid === uuid)
        .map(op => ({ ...op, folderUuid: null }))
      if (updatedOps.length > 0) {
        dispatch(operationsActions.updateOperations(updatedOps))
      }

      for (const folder of Object.values(folders)) {
        if (folder?.parentUuid === uuid) {
          dispatch(foldersActions.setFolder({ uuid: folder.uuid, parentUuid: null }))
        }
      }
    }

    await dbExecute('UPDATE folders SET deleted = 1 WHERE uuid = ?', [uuid], dbParams)
    dispatch(foldersActions.unsetFolder(uuid))
  }
}

export function moveOperationToFolder ({ operationUuid, folderUuid }, dbParams = {}) {
  return async (dispatch) => {
    await dbExecute('UPDATE operations SET folderUuid = ? WHERE uuid = ?', [folderUuid ?? null, operationUuid], dbParams)
    dispatch(operationsActions.setOperation({ uuid: operationUuid, folderUuid: folderUuid ?? null }))
  }
}

export function moveFolderToFolder ({ folderUuid, newParentUuid }, dbParams = {}) {
  return async (dispatch, getState) => {
    const state = getState()
    const folders = state?.folders?.info ?? {}
    let check = newParentUuid
    while (check) {
      if (check === folderUuid) return
      check = folders[check]?.parentUuid ?? null
    }
    const now = Date.now()
    await dbExecute('UPDATE folders SET parentUuid = ?, updatedAtMillis = ? WHERE uuid = ?', [newParentUuid ?? null, now, folderUuid], dbParams)
    dispatch(foldersActions.setFolder({ ...folders[folderUuid], parentUuid: newParentUuid ?? null, updatedAtMillis: now }))
  }
}
