# Refactoring Implementation Plan: Kanban-Flow Optimization

This document outlines the detailed steps to address three critical improvements identified for the Kanban-Flow project: fixing build scripts, implementing Vue Router, and refactoring column rendering to be data-driven.

## 1. Fix `package.json` Scripts (High Priority)
**Problem:** The `dev:full` script references `npm run mock`, but the actual script definition is named `server`. This causes the parallel execution command to fail.

### Implementation Steps:
1.  **Open `package.json`**.
2.  **Locate the `scripts` section**.
3.  **Update `dev:full` script**:
    *   **Current:** `"dev:full": "concurrently -n mock,vite -c yellow,cyan \"npm run mock\" \"npm run dev\""`
    *   **New:** `"dev:full": "concurrently -n mock,vite -c yellow,cyan \"npm run server\" \"npm run dev\""`
4.  **Verification**: Run `npm run dev:full` to confirm both the backend mock server and frontend Vite server start without errors.

---

## 2. Introduce Vue Router (Critical UX Improvement)
**Problem:** The app uses manual state-based routing (`currentView` variable). This results in lost state on page refresh, no URL sharing capabilities (deep linking), and broken browser back/forward navigation.

### Implementation Steps:
1.  **Install Vue Router**:
    *   Command: `npm install vue-router@4`
2.  **Create Router Configuration**:
    *   Create file: `src/router/index.js`
    *   Define Routes:
        *   `/login` -> `LoginPage`
        *   `/` -> `DashboardView` (Dashboard)
        *   `/board/:id` -> `KanbanBoardView` (Specific Board)
    *   Implement Navigation Guards: Redirect to `/login` if not authenticated.
3.  **Refactor `main.js`**:
    *   Import and use the router instance.
4.  **Refactor `App.vue`**:
    *   Replace the manual `v-if` view switching logic with `<router-view>`.
    *   Keep the global `Sidebar` and Modals outside `<router-view>` (or layout component).
5.  **Update Store (`kanbanStore.js`)**:
    *   Remove `currentView` and `selectedBoardId` state handling logic that controlled views (let the URL drive the state).
    *   Update `selectBoard` actions to sync with route params if necessary.
6.  **Update Navigation Logic**:
    *   Replace `store.setView(...)` calls in components (`Sidebar.vue`, `DashboardView.vue`) with `router.push(...)`.
    *   Ensure clicking a board card navigates to `/board/:id`.

---

## 3. Data-Driven Column Rendering (Scalability)
**Problem:** Column types (`todo`, `inProgress`, `done`) are hardcoded in the frontend. Adding new workflows (e.g., "Review", "QA") requires code changes.

### Implementation Steps:
1.  **Define Column Schema**:
    *   Ensure board data includes a `columns` array defined in `db.json` or the store defaults.
    *   *Examples Structure:* `[{ id: 'todo', title: 'To Do', color: 'slate' }, { id: 'done', title: 'Done', color: 'green' }]`
2.  **Update `KanbanBoardView.vue`**:
    *   Instead of manually placing `<KanbanColumn type="todo" />`, iterate through the columns array:
        ```html
        <KanbanColumn 
          v-for="column in board.columns" 
          :key="column.id" 
          :column="column" 
          ... 
        />
        ```
3.  **Refactor `KanbanColumn.vue`**:
    *   Remove rigid `columnType` logic.
    *   Accept a `column` object prop containing title, id, and style info.
    *   Dynamically apply styles based on the passed configuration rather than hardcoded classes.
4.  **Update Data Seeding (`src/data/seed.js`)**:
    *   Ensure seed data includes default column definitions for existing boards.
