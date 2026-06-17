# Operation Archive feature

This branch adds a lightweight operation archive workflow to the Home screen and Operation Data screen.

The feature was built as a simpler alternative to a full folder hierarchy. It introduces one special, localized Home-screen entry named **Archive**. Operations can be marked as archived from their Operation Data screen, then they disappear from the normal Home list and become visible inside the Archive view.

## User-facing behavior

### Home screen

The Home screen continues to show active, non-deleted operations in the existing sort order.

A fixed **Archive** entry is appended as the final row of the main Home list. It is deliberately not a normal operation and is not stored as an operation record.

The Archive row:

- is always the last item in the main Home list;
- uses localized text from `screens.home.archiveFolder`;
- displays the label in uppercase, matching the requested UI examples;
- displays the label in bold;
- displays an archive icon next to the label;
- displays a count badge on the right with the number of archived operations;
- uses the same row padding and count alignment as normal operation rows.

Example main-list layout:

```text
CT7AUP at CT/ES-006                                      0
Monfirre                                             Today

CT7AUP at CT/ES-005                                      0
Monte do Alqueidão                                   Today

ARCHIVE  [archive icon]                                  1
```

### Archive view

Tapping the Archive row switches the Home screen into an Archive view. In this view:

- only archived operations are listed;
- the normal “New Operation” floating action button is hidden;
- a header row is shown at the top to navigate back to the normal Home list;
- the header uses the archive icon before the Archive label, per the requested UI adjustment.

Example archive-header layout:

```text
←  [archive icon]  ARCHIVE
```

The back/header row exits the Archive view and returns to the main operation list.

### Marking an operation as archived

A new checkbox was added to the Operation Data screen:

Path in the app:

```text
Operation → Oper tab → Manage Operation Logs / Operation Data
```

The checkbox is shown in a new **Operation Management** section above **Export QSOs**.

The row contains:

- a checkbox;
- an archive icon;
- localized label **Archived**;
- localized description **Show this operation in Archive**.

Toggling the checkbox immediately updates the operation's local state. Once checked, the operation is filtered out of the normal Home list and appears in Archive. Unchecking it moves the operation back to the normal list.

## Data model

The archive marker is stored in existing local operation data:

```js
operation.local.archived === true
```

The implementation uses the existing `setOperationLocalData` action:

```js
setOperationLocalData({ uuid: operation.uuid, archived: true })
```

or, when unarchiving:

```js
setOperationLocalData({ uuid: operation.uuid, archived: false })
```

This intentionally avoids adding a new SQLite column or table.

### Why `operation.local`?

`operation.local` is already persisted in the `operations.localData` SQLite column. The existing `saveOperationLocalData` path writes only local operation metadata and does not mark the operation as needing sync.

This matches the desired behavior:

- archive status is local-only;
- no database schema migration is required;
- no remote sync side effects are introduced;
- the original operation data structure remains unchanged except for existing local metadata.

## Code changes

### `src/store/operations/operationsSlice.js`

Added selector:

```js
selectOperationIdsByArchived(state, archived)
```

The selector filters operations by:

- valid operation UUID;
- existing deleted-operation visibility rules (`settings.showDeletedOps`);
- `Boolean(operation.local.archived) === Boolean(archived)`;
- existing operation sort order via `_operationSorter`.

This keeps the main list and Archive list logic centralized and preserves the existing operation ordering behavior.

### `src/screens/HomeScreen/HomeScreen.jsx`

Added local UI state:

```js
const [showArchive, setShowArchive] = useState(false)
```

When `showArchive` is false:

- `selectOperationIdsByArchived(state, false)` supplies the normal operation IDs;
- a special sentinel item `__archive__` is appended to the list data;
- `ArchiveItem` renders that sentinel as the final Archive row.

When `showArchive` is true:

- `selectOperationIdsByArchived(state, true)` supplies archived operation IDs;
- `ArchiveHeader` is rendered as `ListHeaderComponent`;
- the normal `New Operation` FAB is hidden.

The Archive row is not persisted and is not part of the operation collection; it is only a UI sentinel in the Home screen list.

### `src/screens/OperationScreens/OpSettingsTab/OperationDataScreen.jsx`

Imported `setOperationLocalData` and added `handleArchivedToggle`:

```js
const handleArchivedToggle = useCallback(() => {
  dispatch(setOperationLocalData({ uuid: operation.uuid, archived: !operation?.local?.archived }))
}, [dispatch, operation?.local?.archived, operation.uuid])
```

Added a localized **Operation Management** section above **Export QSOs** containing the **Archived** checkbox row.

### i18n files

New translation keys were added across the existing i18n resources and Crowdin files:

```json
"screens": {
  "home": {
    "archiveFolder": "Archive",
    "archiveFolder-a11y": "Archive",
    "archiveBack-a11y": "Back to operations"
  },
  "operationData": {
    "operationManagement": "Operation Management",
    "archived": "Archived",
    "archivedDescription": "Show this operation in Archive"
  }
}
```

Portuguese examples:

```json
"archiveFolder": "Arquivo",
"archiveFolder-a11y": "Arquivo",
"archiveBack-a11y": "Voltar às operações",
"operationManagement": "Gestão da Operação",
"archived": "Arquivado",
"archivedDescription": "Mostrar esta operação no Arquivo"
```

The Home row uppercases the localized Archive label at render time, so translations remain in natural title case.

## Validation performed

The following validations were performed during development:

- JavaScript/JSX parsing of modified source files with Babel parser.
- JSON parsing of all translation files.
- Android release build targeting `arm64-v8a`.
- Verified release APK package metadata and bundle inclusion.

The generated test APK was built as a release APK, not debug, to avoid React Native Metro/DevSupport behavior.

## Notes for upstream integration

The branch also contains Android build/package adjustments used to generate a locally installable CT7AUP APK:

- package ID changed to `com.ct7aup.polo`;
- app label changed to `PoLo CT7AUP`;
- release/debug suffixes removed;
- Hermes source-map output disabled;
- `arm64-v8a` target added for faster local builds.

Those Android packaging changes are for local testing and side-by-side installation. They are not required for the Archive feature itself and can be excluded if the feature is merged upstream into the official application.

For upstreaming the Archive feature, the important app-level files are:

- `src/store/operations/operationsSlice.js`
- `src/screens/HomeScreen/HomeScreen.jsx`
- `src/screens/OperationScreens/OpSettingsTab/OperationDataScreen.jsx`
- `src/i18n/resources/*/polo.json`
- `src/i18n/crowdin/*/polo.json`

## Design rationale

This implementation intentionally avoids a general folder system. A single Archive view is enough for the requested workflow and keeps the data model simple.

Advantages:

- no schema migration;
- minimal persistence changes;
- no remote sync implications;
- low UI complexity;
- localized user-facing strings;
- archive count is derived from existing operation state;
- easy to remove or evolve later into a fuller categorization system if needed.
