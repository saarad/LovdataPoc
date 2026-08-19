namespace LovdataPocApi.Mocks;

/// <summary>Fictional sample data for HMS integration development; not legal advice.</summary>
public sealed class LovdataMockCatalog
{
    public IReadOnlyList<LovdataDocument> Documents { get; } =
    [
        new("NL/lov/2005-06-17-62", "lov/2005-06-17-62", "Lov om arbeidsmiljø, arbeidstid og stillingsvern mv. (arbeidsmiljøloven)", "Arbeidsmiljøloven", "NL", "2005-06-17", "2025-01-01", "Arbeids- og inkluderingsdepartementet", "HMS og arbeidsmiljø"),
        new("SF/forskrift/1996-12-06-1127", "forskrift/1996-12-06-1127", "Forskrift om systematisk helse-, miljø- og sikkerhetsarbeid i virksomheter (Internkontrollforskriften)", "Internkontrollforskriften", "SF", "1996-12-06", "2025-01-01", "Arbeids- og inkluderingsdepartementet", "Systematisk HMS-arbeid")
    ];

    public LovdataDocument? Find(string? reference) => Documents.FirstOrDefault(item =>
        string.Equals(item.DokId, reference, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(item.RefId, reference, StringComparison.OrdinalIgnoreCase));
}

public sealed record LovdataDocument(string DokId, string RefId, string Title, string ShortTitle, string Base, string DatePromulgated, string LastModified, string Ministry, string MockTopic);
