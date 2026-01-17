Phase 1 (UI-only) mock state.

- Stored in localStorage under `mpplaygo_mock_state_v1`
- Includes users, playlists, and listening history
- Used by `components/providers/app-provider.jsx`

This folder exists so Phase 2 can swap implementation to Supabase while keeping UI stable.
