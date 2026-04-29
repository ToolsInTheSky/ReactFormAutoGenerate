# ReactFormAutoGenerate Development Notes

## Build & Test Workflow

- **Frontend:** After making changes to the React client, run `yarn build` in the `ReactFormAutoGenerate.Client` directory.
- **Backend:** After making changes to the ASP.NET Core server, ensure any running server instance (e.g., in another terminal) is terminated to avoid file locking, then run `dotnet build` in the `ReactFormAutoGenerate.Server` directory.

## Configuration Notes

- **Backend Port:** The backend is configured to use port **44318** for HTTPS in both IIS Express and Kestrel (`dotnet run`).
- **Frontend Proxy:** The Vite development server is configured to proxy `/api` and `/graphql` requests to `https://localhost:44318`.
- **Package Manager:** Use `yarn` for all frontend package management.
