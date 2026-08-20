using LovdataPocApi.Mocks;
using LovdataPocApi.Infrastructure.Lovdata;
using LovdataPocApi.Features.Compliance;

var builder = WebApplication.CreateBuilder(args);

// Framework-supported OpenAPI generation; no Swashbuckle dependency is required.
builder.Services.AddOpenApi();
builder.Services.AddSingleton<LovdataMockCatalog>();
builder.Services.AddLovdataClient(builder.Configuration);
builder.Services.AddSingleton<ComplianceStore>();

var app = builder.Build();

// TLS terminates at Azure Container Apps (and at Vercel for proxied requests).
// Avoid redirecting internal probe traffic from the container's HTTP port.
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
    .ExcludeFromDescription();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/hello", () => Results.Ok(new HelloResponse("Hello world")))
    .WithName("GetHelloWorld")
    .WithSummary("Returns a hello-world greeting.")
    .Produces<HelloResponse>(StatusCodes.Status200OK);

app.MapLovdataMock();
app.MapComplianceApi();

app.MapOpenApi();

// Let React Router handle browser routes after API and static-file routing.
app.MapFallbackToFile("index.html");

app.Run();

public sealed record HelloResponse(string Message);
