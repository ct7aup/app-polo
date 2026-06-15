// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { createSelector, createSlice } from '@reduxjs/toolkit'

const INITIAL_STATE = {
  info: {},
  currentFolderUuid: null
}

export const foldersSlice = createSlice({
  name: 'folders',

  initialState: INITIAL_STATE,

  reducers: {
    setFolders: (state, action) => {
      state.info = {}
      for (const folder of action.payload) {
        state.info[folder.uuid] = folder
      }
    },
    setFolder: (state, action) => {
      state.info[action.payload.uuid] = {
        ...state.info[action.payload.uuid],
        ...action.payload
      }
    },
    unsetFolder: (state, action) => {
      delete state.info[action.payload]
    },
    setCurrentFolderUuid: (state, action) => {
      state.currentFolderUuid = action.payload
    }
  }
})

export const { actions } = foldersSlice

export const selectAllFolders = (state) => state?.folders?.info ?? {}

export const selectCurrentFolderUuid = (state) => state?.folders?.currentFolderUuid ?? null

export const selectFoldersList = createSelector(
  (state) => state?.folders?.info,
  (state, parentUuid) => parentUuid,
  (info, parentUuid) => {
    return Object.values(info || {})
      .filter(f => f?.uuid && !f?.deleted && (f.parentUuid ?? null) === (parentUuid ?? null))
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  }
)

export const selectFolderBreadcrumbs = createSelector(
  (state) => state?.folders?.info,
  (state, folderUuid) => folderUuid,
  (info, folderUuid) => {
    const crumbs = []
    let current = folderUuid
    while (current) {
      const folder = info?.[current]
      if (!folder) break
      crumbs.unshift(folder)
      current = folder.parentUuid ?? null
    }
    return crumbs
  }
)

export const selectCurrentFolder = createSelector(
  (state) => state?.folders?.info,
  selectCurrentFolderUuid,
  (info, uuid) => (uuid ? info?.[uuid] ?? null : null)
)

export default foldersSlice.reducer
