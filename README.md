# Expanse Cron Generator

Small Vite + React app for writing a standard 5-part cron expression and reading it back in plain English.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Notes

- Input is validated as `minute hour day-of-month month day-of-week`.
- Month names (`JAN-DEC`) and weekday names (`SUN-SAT`) are supported.
- A leading `/5` is normalized to `*/5`.
