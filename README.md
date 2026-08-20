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

## Production deployment

The React client is deployed to Vercel and the .NET API is deployed to Azure Container Apps in West Europe. Vercel proxies `/api/*` and `/openapi/*` through the `api/backend-proxy.js` function, so the browser continues using same-origin URLs without CORS configuration.

### One-time Azure and GitHub setup

1. In Microsoft Entra ID, create an app registration/service principal and add a federated credential for this repository's `production` GitHub environment. Use the subject `repo:saarad/LovdataPoc:environment:production` and audience `api://AzureADTokenExchange`.
2. Give the service principal Contributor and Role Based Access Control Administrator access to the Azure subscription or to the `lovdata-poc-prod` resource group. Contributor provisions the resources; RBAC Administrator permits the workflow to grant the container identity `AcrPull` without broader identity-management access.
3. In the GitHub `production` environment, add secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID`.
4. Add the GitHub repository variable `AZURE_NAME_SUFFIX`. It must be 3-12 lowercase letters or digits and should be globally distinctive because it is included in the Azure Container Registry name.
5. Run **Deploy API to Azure Container Apps** from GitHub Actions. Later pushes to `main` that change backend or infrastructure files deploy automatically.

The workflow publishes the API URL in its job summary. In Vercel, add `BACKEND_API_URL` with that HTTPS URL for Production and Preview, then redeploy the frontend. Requests such as `/api/tenants` will then reach Azure through the Vercel proxy.

The current compliance store is held in memory. Azure is intentionally limited to one replica; restarts and deployments reset the demo data. Durable storage should be added before treating this as production data.

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
