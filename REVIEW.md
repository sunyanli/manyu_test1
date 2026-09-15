# manyu-test1-frontend Review Profile

**Project**: Vue 3 SPA demo/frontend application (package name: `manyu-test1-frontend`)
**Stack**: Vue 3.4+ (Composition API with `<script setup>`), Axios, Vite, ECharts
**State management**: Lightweight `reactive()` singletons (no Pinia/Vuex)
**API pattern**: Axios instance with request/response interceptors

## Review gates

- **Vue SFC conventions**: `<script setup>` only; scoped styles; component-based architecture
- **API layer**: All API calls go through `src/api/*.js` with interceptors for auth token injection and 401 handling
- **Auth**: JWT token stored in localStorage; `reactive` store singleton shared across modules
- **Design doc conformance**: Implementation must match interfaces defined in `.agents/*/design.md`
- **Error handling**: All async operations must have try/catch with user-visible messages (no silent failures on mutations)
- **Form validation**: Client-side validation before API calls; match design-doc constraints (name length ≤ 200, required fields)