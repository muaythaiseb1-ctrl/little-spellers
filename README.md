# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Logins and passwords

Passwords are checked by the server (`server/auth.js`), not in the browser code.

1. Copy `.env.example` to `.env`.
2. Set `TEACHER_PASSWORD`, `ADMIN_PASSWORD` and `SESSION_SECRET`.
3. Run `npm run dev` (development) or `npm run build && npm start` (production).

If a password is not set, that login is turned off and the login screen says so.
On a hosting service, set the same names as environment variables instead of using a `.env` file.

Students still log in with their student ID, but the check now happens on the server
against the server's class list.
