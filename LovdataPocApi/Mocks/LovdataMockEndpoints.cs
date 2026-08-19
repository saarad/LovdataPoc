using System.Text.Json;

namespace LovdataPocApi.Mocks;

public static class LovdataMockEndpoints
{
    private const string Notice = "Mock response only. Not legal advice or an authoritative Lovdata response.";

    public static void MapLovdataMock(this WebApplication app)
    {
        var mock = app.MapGroup("/api/mock/lovdata").WithTags("Mock Lovdata API");

        mock.MapGet("/", () => Results.Ok(new
        {
            name = "Lovdata API mock", sourceSpecification = "Resources/lovdataapi.json", notice = Notice,
            supportedOperations = new[] { "/documentIndex", "/documentHistory", "/baseHistory", "/listBase", "/documentMeta", "/lookup", "/renderRefID", "/genref", "/ping", "/v1/userinfo", "/v1/structuredRules/*", "/v1/publicData/*", "/v1/search", "/v1/download/document", "/v1/documentPartChanges", "/v1/legalSource/list", "/vocabulary/*", "/version" },
            notMockedYet = new[] { "/v1/upload/{baseName}", "/v1/ai/*", "/v2/ai/*", "/apichanges*", "/privacy" }
        }));
        mock.MapGet("/ping", () => Results.Ok(new { status = "ok", mock = true }));
        mock.MapGet("/version", () => Results.Ok(new { name = "Lovdata API mock", revision = "local", timestamp = "2026-08-18T00:00:00Z" }));
        mock.MapGet("/v1/userinfo", () => Results.Ok(new { userID = 1001, login = "hms-demo@example.test", companyID = 2001, mock = true }));

        mock.MapGet("/documentMeta", (string? dokID, LovdataMockCatalog catalog) => Get(dokID, catalog, document => Results.Ok(ToDocument(document))));
        mock.MapGet("/lookup", (string? refID, string? dokID, LovdataMockCatalog catalog) => Results.Ok(new { exists = catalog.Find(dokID ?? refID) is not null }));
        mock.MapGet("/documentIndex", (string? refID, LovdataMockCatalog catalog) => Get(refID, catalog, document => Results.Ok(Index(document))));
        mock.MapGet("/documentHistory", (string? refID, LovdataMockCatalog catalog) => Get(refID, catalog, document => Results.Ok(new[] { ToDocument(document) })));
        mock.MapGet("/baseHistory", (string? @base, int? limit, int? offset, LovdataMockCatalog catalog) => Results.Ok(Page(Filter(@base, catalog), limit, offset).Select(ToDocument)));
        mock.MapGet("/listBase", (string? @base, LovdataMockCatalog catalog) => Results.Ok(Filter(@base, catalog).Select(document => document.DokId)));
        mock.MapGet("/renderRefID", (string? refID, string? format, LovdataMockCatalog catalog) =>
        {
            var document = catalog.Find(refID);
            if (document is null) return Missing(refID);
            var html = $"<article data-mock=\"true\"><h1>{document.Title}</h1><p><strong>Mock content:</strong> Verify current legal text with Lovdata before operational use.</p></article>";
            return string.Equals(format, "json", StringComparison.OrdinalIgnoreCase) ? Results.Ok(new { html, mock = true, notice = Notice }) : Results.Content(html, "text/html; charset=utf-8");
        });
        mock.MapGet("/genref", (string? input) => Results.Ok(Genref(input ?? string.Empty)));
        mock.MapPost("/genref", async (HttpRequest request) => Results.Ok(Genref(await Input(request))));

        mock.MapGet("/v1/structuredRules/list", () => Results.Ok(new { bases = new[] { new { @base = "NL", description = "Norske lover" }, new { @base = "SF", description = "Sentrale forskrifter" } } }));
        mock.MapGet("/v1/structuredRules/list/{baseName}", (string baseName, LovdataMockCatalog catalog) => Results.Ok(new { documents = Filter(baseName, catalog).Select(StructuredDocument) }));
        mock.MapGet("/v1/structuredRules/get/{baseName}/{ruleFile}/{date?}", (string baseName, string ruleFile, string? date, LovdataMockCatalog catalog) =>
        {
            var document = Filter(baseName, catalog).FirstOrDefault(item => item.DokId.EndsWith(ruleFile, StringComparison.OrdinalIgnoreCase));
            return document is null ? Missing(ruleFile) : Results.Ok(new { iD = document.DokId, title = document.Title, effectiveDate = date ?? "2025-01-01", content = new { type = "document", children = new[] { new { id = "section-3-1", title = "§ 3-1", text = "Mock structured content for systematisk HMS-arbeid." } } }, mock = true, notice = Notice });
        });
        mock.MapGet("/v1/structuredRules/timeline/{baseName}/{ruleFile}", (string baseName, string ruleFile) => Results.Ok(new { @base = baseName, ruleFile, versions = new[] { "2024-01-01", "2025-01-01" }, mock = true }));

        mock.MapGet("/v1/search", (string? query, int? limit, int? offset, LovdataMockCatalog catalog) =>
        {
            var matches = catalog.Documents.Where(item => string.IsNullOrWhiteSpace(query) || $"{item.Title} {item.MockTopic}".Contains(query, StringComparison.OrdinalIgnoreCase));
            return Results.Ok(new { query, total = matches.Count(), results = Page(matches, limit, offset).Select(item => new { dokID = item.DokId, refID = item.RefId, title = item.Title, highlight = $"Mock match for {item.MockTopic}", score = 1.0 }) });
        });
        mock.MapGet("/v1/download/document", (string? dokID, LovdataMockCatalog catalog) => Get(dokID, catalog, document => Results.Text($"Mock document download: {document.Title}", "text/plain")));
        mock.MapGet("/v1/documentPartChanges", (string? dokID) => Results.Ok(new { dokID, changes = new[] { new { partID = "section-3-1", changed = "2025-01-01", description = "Mock change entry" } }, mock = true }));
        mock.MapGet("/v1/legalSource/list", LegalSources);
        mock.MapGet("/vocabulary/legalSources", LegalSources);
        mock.MapGet("/vocabulary/legalAreas", () => Results.Ok(new[] { new { id = "arbeidsmiljo", code = "ARBEIDSMILJO", title = "Arbeidsmiljø", parentId = (string?)null }, new { id = "transport", code = "TRANSPORT", title = "Transport", parentId = (string?)null } }));
        mock.MapGet("/v1/publicData/list", () => Results.Ok(new[] { new { filename = "gjeldende-lover.tar.bz2", title = "Mock: gjeldende lover", updated = "2026-08-18" }, new { filename = "gjeldende-sentrale-forskrifter.tar.bz2", title = "Mock: sentrale forskrifter", updated = "2026-08-18" } }));
        mock.MapGet("/v1/publicData/get/{filename}", (string filename) => Results.Text($"Mock public-data package: {filename}", "application/octet-stream"));
    }

    private static IResult Get(string? reference, LovdataMockCatalog catalog, Func<LovdataDocument, IResult> found) => catalog.Find(reference) is { } document ? found(document) : Missing(reference);
    private static IResult Missing(string? reference) => Results.NotFound(new { message = "Mock Lovdata document was not found.", reference, mock = true });
    private static IEnumerable<LovdataDocument> Filter(string? baseName, LovdataMockCatalog catalog) => catalog.Documents.Where(item => baseName is null || item.Base.Equals(baseName, StringComparison.OrdinalIgnoreCase));
    private static IEnumerable<LovdataDocument> Page(IEnumerable<LovdataDocument> documents, int? limit, int? offset) => documents.Skip(Math.Max(offset ?? 0, 0)).Take(Math.Clamp(limit ?? 100, 1, 100));
    private static object ToDocument(LovdataDocument item) => new { dokID = item.DokId, refID = item.RefId, title = item.Title, shortTitle = item.ShortTitle, @base = item.Base, datePromulgated = item.DatePromulgated, lastModified = item.LastModified, ministry = item.Ministry, mock = true };
    private static object StructuredDocument(LovdataDocument item) => new { iD = item.DokId, title = item.Title, shortTitle = item.ShortTitle, datePromulgated = item.DatePromulgated, lastModified = item.LastModified, ministry = item.Ministry };
    private static object Index(LovdataDocument item) => new { refID = item.RefId, url = item.RefId, id = "root", title = item.Title, level = 0, children = new[] { new { refID = $"{item.RefId}/§1", url = $"{item.RefId}/§1", id = "section-1", title = "§ 1. Formål", level = 1 }, new { refID = $"{item.RefId}/§3-1", url = $"{item.RefId}/§3-1", id = "section-3-1", title = "§ 3-1. Systematisk HMS-arbeid", level = 1 } } };
    private static IResult LegalSources() => Results.Ok(new[] { new { id = "NL", description = "Norske lover" }, new { id = "SF", description = "Sentrale forskrifter" } });
    private static object Genref(string input) => new { input, appliedString = input, diff = Array.Empty<object>(), model = Array.Empty<object>(), mock = true };
    private static async Task<string> Input(HttpRequest request)
    {
        if (!request.HasJsonContentType()) return string.Empty;
        var body = await request.ReadFromJsonAsync<JsonElement>();
        return body.ValueKind == JsonValueKind.Object && body.TryGetProperty("input", out var input) ? input.GetString() ?? string.Empty : string.Empty;
    }
}
