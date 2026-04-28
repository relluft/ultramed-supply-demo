# UltraMed Supply

Frontend MVP demo for the UltraMed Supply dental clinic supply workflow.

The demo uses React, TypeScript, Vite, Tailwind CSS, `react-router-dom`, `lucide-react`, and client-side mock state in `localStorage`. There is no backend, database, real authorization, email sending, or supplier integration.

## Launch

```bash
npm install
npm run dev
```

Default local URL:

```text
http://127.0.0.1:5173/
```

## Build

```bash
npm run build
```

## Main Demo Flow

1. Start the demo and select `Кабинет 101`.
2. Add `Перчатки нитриловые M`, `Композит A2`, and a manual line through `Позиция не найдена`.
3. Switch to `Старшая медсестра`.
4. Issue stock, create replenishment, confirm supplier availability, form orders, accept receipt, and review the journal.
