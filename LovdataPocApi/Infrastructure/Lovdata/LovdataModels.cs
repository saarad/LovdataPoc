namespace LovdataPocApi.Infrastructure.Lovdata;

public sealed record LovdataSearchResponse(string? Query, int Total, IReadOnlyList<LovdataSearchResult> Results);
public sealed record LovdataSearchResult(string DokID, string RefID, string Title, string Highlight, double Score);
public sealed record LovdataDocument(string DokID, string RefID, string Title, string? ShortTitle, string Base, DateOnly? DatePromulgated, DateOnly? LastModified, string? Ministry);
public sealed record LovdataDocumentIndex(string RefID, string Id, string Title, int Level, IReadOnlyList<LovdataDocumentIndexNode> Children);
public sealed record LovdataDocumentIndexNode(string RefID, string Id, string Title, int Level);
public sealed record LovdataRenderedDocument(string Html);
