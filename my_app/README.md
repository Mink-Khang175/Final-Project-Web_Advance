# MyApp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Deploy to Vercel (Frontend + Backend)

This project should be deployed as 2 Vercel projects:

1. `my_server` (Express API)
2. `my_app` (Angular frontend)

### 1) Deploy backend (`my_server`)

```bash
cd ../my_server
vercel
```

Set these environment variables in Vercel project settings:

- `MONGODB_URI`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, default: `gemini-2.0-flash`)
- `GEMINI_API_VERSION` (optional, default: `v1beta`)
- `GEMINI_TIMEOUT_MS` (optional, default: `20000`)

After deploy, copy your backend domain, for example:

`https://my-server-abc.vercel.app`

### 2) Update frontend rewrite (`my_app/vercel.json`)

Replace this placeholder:

`https://YOUR-BACKEND-PROJECT.vercel.app`

with your real backend domain from step 1.

### 3) Deploy frontend (`my_app`)

```bash
cd ../my_app
vercel
```

For production deploy:

```bash
vercel --prod
```

### Notes

- Frontend rewrites `/api/*` to backend Vercel URL.
- Backend is configured to run both locally and on Vercel serverless.
