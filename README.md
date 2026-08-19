# Lovdata POC

A React client and .NET 10 API that can run in one Azure App Service. The API has no Swashbuckle dependency; it uses the ASP.NET Core OpenAPI generator. `Microsoft.OpenApi` is explicitly pinned to a patched version to replace the vulnerable transitive version in the current ASP.NET Core package.

## Run locally

In one terminal, run the API:

```powershell
dotnet run --project .\LovdataPocApi
```

In another, run the React development server:

```powershell
cd .\LovdataPocApi\ClientApp
npm ci
npm run dev
```

Open the Vite address (normally `http://localhost:5173`) and click **Say hello**. The client proxies `/api` to the .NET server. The raw OpenAPI document is available at `/openapi/v1.json`.

## Azure App Service deployment

Deploy the .NET project. `dotnet publish` runs `npm ci` and `npm run build`, then copies the resulting React files into the published app's `wwwroot`. App Service serves the client and API from the same origin—no production CORS configuration is needed.

The App Service build environment needs Node.js 18+ (Node 20 LTS is recommended) as well as the .NET 10 SDK. Its startup command should be `dotnet LovdataPocApi.dll`.

## Lovdata mock API

The application includes an in-memory mock of the HMS-relevant operations from `LovdataPocApi/Resources/lovdataapi.json`. It never calls Lovdata; all content is sample-only and must not be used as authoritative legal text.

With the API running, browse `http://localhost:5292/api/mock/lovdata/`. For example:

```powershell
Invoke-RestMethod "http://localhost:5292/api/mock/lovdata/v1/search?query=HMS"
Invoke-RestMethod "http://localhost:5292/api/mock/lovdata/documentMeta?dokID=NL/lov/2005-06-17-62"
```

The mock covers document metadata, indexes, history and rendering; structured rules; search; legal-area and legal-source vocabularies; public-data listings; and the basic system endpoints. Upload and AI operations are intentionally deferred until the HMS requirements define their expected behavior.

## Lovdata integration boundary

HMS application services should inject `ILovdataClient` from `Infrastructure/Lovdata`, rather than call the mock endpoints directly. Its first operations are search, document metadata, document index and rendered content. The configured HTTP client points to the mock in development.

To use a real service later, set these App Service configuration values (or user secrets locally) without changing consumers of `ILovdataClient`:

```text
Lovdata__BaseUrl=https://api.lovdata.no/
Lovdata__ApiKey=<your-key>
```

Do not add `Lovdata__ApiKey` to `appsettings.json` or source control.

## Compliance MVP slice

The initial UI implements the core law-list workspace: a compliance dashboard, a paragraph-centred law-list table, a side panel for recording the business impact, measures and status, LCK questions, and a Lovdata search panel. The corresponding API is under `/api`:

```text
GET   /api/dashboard
GET   /api/law-lists/work-environment
GET   /api/requirements/{id}
PATCH /api/requirements/{id}
GET   /api/lovdata/search?query=HMS
```

This is an in-memory, single demo-tenant foundation. Authentication, durable multi-tenant storage, LCK sending/responding, file uploads, AI generation, notification delivery and reporting remain the next feature slices.
