namespace LovdataPocApi.Features.Compliance;

/// <summary>Temporary in-memory demo data. Replace with tenant-aware persistence before production.</summary>
public sealed class ComplianceStore
{
    /// <summary>Admin-controlled lifecycle; correspondence may happen outside the system.</summary>
    public static readonly string[] LckStatuses = ["Klargjort", "Sendt", "Pågår", "Besvart", "Til gjennomgang", "Lukket"];

    // Spec §31
    public static readonly string[] DeviationStatuses = ["Åpent", "Under behandling", "Tiltak etablert", "Til verifisering", "Lukket"];

    // Spec §32
    public static readonly string[] ActionStatuses = ["Planlagt", "Pågår", "Fullført", "Verifisert"];

    // Spec §36
    public static readonly string[] LegalChangeStatuses = ["Ikke vurdert", "Under vurdering", "Ikke relevant", "Ingen tiltak nødvendig", "Krever tiltak", "Ferdig behandlet"];

    private readonly object gate = new();

    public IReadOnlyList<Tenant> Tenants { get; } =
    [
        new("nordic-bus", "Nordic Bus AS", "Kollektivtransport", "Busselskap med 2 500 ansatte, 20 depoter, egne verksteder og elektriske busser.", ["Region Nord", "Region Midt", "Region Vest"]),
        new("fjord-logistikk", "Fjord Logistikk AS", "Gods og logistikk", "Godstransport med terminaler i Bergen og Ålesund.", ["Bergen", "Ålesund"]),
        new("vestland-buss", "Vestland Buss AS", "Kollektivtransport", "Regional bussoperatør med to depoter.", ["Førde", "Voss"])
    ];

    /// <summary>Spec: tilgangsnivå per bruker, redigerbart fra virksomhetssiden.</summary>
    public static readonly string[] AccessLevels = ["Systemadministrator", "Virksomhetsadministrator", "Avdelingsleder", "Respondent", "Lesetilgang"];

    /// <summary>Modulrettigheter som kan skrus av og på per bruker.</summary>
    public static readonly string[] PermissionOptions = ["Lovregister", "Lovlister", "LCK", "Avvik og tiltak", "Lovendringer", "Rapporter", "Brukeradministrasjon"];

    private readonly List<DemoUser> users =
    [
        new("ingrid", "nordic-bus", "Ingrid Hansen", "HSEQ-administrator", "Region Midt", "ingrid.hansen@nordicbus.no"),
        new("nils", "nordic-bus", "Nils Haugen", "Avdelingsleder", "Region Midt", "nils.haugen@nordicbus.no"),
        new("sara", "nordic-bus", "Sara Lie", "Verneombud", "Region Nord", "sara.lie@nordicbus.no"),
        new("tom", "nordic-bus", "Tom Berg", "Verkstedleder", "Region Vest", "tom.berg@nordicbus.no"),
        new("erik", "fjord-logistikk", "Erik Vold", "HMS-leder", "Bergen", "erik.vold@fjordlogistikk.no"),
        new("mari", "fjord-logistikk", "Mari Sund", "Terminalleder", "Ålesund", "mari.sund@fjordlogistikk.no"),
        new("jon", "vestland-buss", "Jon Aare", "Driftssjef", "Førde", "jon.aare@vestlandbuss.no"),
        new("lise", "vestland-buss", "Lise Moen", "Depotleder", "Voss", "lise.moen@vestlandbuss.no")
    ];

    public IReadOnlyList<DemoUser> Users => users;

    /// <summary>Global Lovdata-derived register. Shared across tenants and never edited by a tenant.</summary>
    private readonly List<LawRequirement> register =
    [
        new("aml-2a-3", "Arbeidsmiljø", "Arbeidsmiljøloven", "NL/lov/2005-06-17-62", "lov/2005-06-17-62", "§ 2 A-3",
            "Arbeidsgiver skal ha rutiner for intern varsling og plikt til å undersøke varsel innen rimelig tid.", "Ingen endring"),
        new("aml-3-1", "Arbeidsmiljø", "Arbeidsmiljøloven", "NL/lov/2005-06-17-62", "lov/2005-06-17-62", "§ 3-1",
            "Arbeidsgiver skal sørge for systematisk helse-, miljø- og sikkerhetsarbeid på alle plan i virksomheten.", "Ingen endring"),
        new("aml-4-1", "Arbeidsmiljø", "Arbeidsmiljøloven", "NL/lov/2005-06-17-62", "lov/2005-06-17-62", "§ 4-1",
            "Arbeidsmiljøet i virksomheten skal være fullt forsvarlig ut fra en enkeltvis og samlet vurdering.", "Ingen endring"),
        new("aml-10-8", "Arbeidstid", "Arbeidsmiljøloven", "NL/lov/2005-06-17-62", "lov/2005-06-17-62", "§ 10-8",
            "Arbeidstaker skal ha minst 11 timer sammenhengende arbeidsfri i løpet av 24 timer.", "Ingen endring"),
        new("ikf-5", "Internkontroll", "Internkontrollforskriften", "SF/forskrift/1996-12-06-1127", "forskrift/1996-12-06-1127", "§ 5",
            "Internkontrollen skal dokumenteres og tilpasses virksomhetens art, aktiviteter og risikoforhold.", "Ny lovendring"),
        new("ytl-4", "Transportløyve", "Yrkestransportlova", "NL/lov/2002-06-21-45", "lov/2002-06-21-45", "§ 4",
            "Den som mot vederlag vil drive persontransport med motorvogn må ha løyve.", "Ingen endring"),
        new("khf-2", "Trafikksikkerhet", "Kjøre- og hviletidsforskriften", "SF/forskrift/2007-07-02-877", "forskrift/2007-07-02-877", "§ 2",
            "Krav til kjøretid, pauser og hviletid for fører, med tilhørende registrering i fartsskriver.", "Ny lovendring"),
        new("vtl-21", "Trafikksikkerhet", "Vegtrafikkloven", "NL/lov/1965-06-18-4", "lov/1965-06-18-4", "§ 21",
            "Ingen må føre kjøretøy når vedkommende ikke kan anses skikket til det, og kjøretøyet skal være i forsvarlig stand.", "Ingen endring")
    ];

    private readonly List<RequirementContent> contents = [];
    private readonly List<LawList> lawLists = [];
    private readonly List<Lck> lcks = [];
    private readonly List<Deviation> deviations = [];
    private readonly List<ActionItem> actions = [];
    private readonly List<LegalChange> legalChanges = [];

    public ComplianceStore()
    {
        SeedAccess();
        SeedContent();
        SeedLawLists();
        SeedLcks();
        SeedLegalChanges();
    }

    public IReadOnlyList<LawRequirement> Register => register;
    public IReadOnlyList<LawList> LawLists => lawLists;
    public IReadOnlyList<Lck> Lcks => lcks;
    public IReadOnlyList<Deviation> Deviations => deviations;
    public IReadOnlyList<ActionItem> Actions => actions;
    public IReadOnlyList<LegalChange> LegalChanges => legalChanges;

    public Tenant? FindTenant(string id) => Tenants.FirstOrDefault(item => item.Id == id);
    public LawRequirement? FindRequirement(string id) => register.FirstOrDefault(item => item.Id == id);
    public LawList? FindLawList(string id) => lawLists.FirstOrDefault(item => item.Id == id);
    public Lck? FindLck(string id) => lcks.FirstOrDefault(item => item.Id == id);
    public DemoUser? FindUser(string id) => users.FirstOrDefault(item => item.Id == id);

    /// <summary>Lovendringen som hører til et lovkrav, brukes for kort endringstekst i lovregisteret.</summary>
    public LegalChange? LegalChangeFor(string requirementId) => legalChanges.FirstOrDefault(item => item.RequirementId == requirementId);

    /// <summary>Spec: tilganger endres direkte fra virksomhetsbildet.</summary>
    public DemoUser? UpdateUser(string id, UpdateUserRequest request)
    {
        lock (gate)
        {
            var user = FindUser(id);
            if (user is null) return null;

            if (request.Role is { Length: > 0 } role) user.Role = role;
            if (request.Unit is { Length: > 0 } unit) user.Unit = unit;
            if (request.AccessLevel is { Length: > 0 } level && AccessLevels.Contains(level)) user.AccessLevel = level;
            if (request.Permissions is { } permissions) user.Permissions = [.. PermissionOptions.Where(permissions.Contains)];
            if (request.Active is { } active) user.Active = active;
            return user;
        }
    }

    /// <summary>Global, curated content per paragraph. Edited from the lovliste, never per tenant.</summary>
    public RequirementContent GetContent(string requirementId)
    {
        lock (gate)
        {
            var existing = contents.FirstOrDefault(item => item.RequirementId == requirementId);
            if (existing is not null) return existing;

            var created = new RequirementContent { RequirementId = requirementId };
            contents.Add(created);
            return created;
        }
    }

    public RequirementContent? UpdateContent(string requirementId, UpdateContentRequest request)
    {
        if (FindRequirement(requirementId) is null) return null;

        lock (gate)
        {
            var content = GetContent(requirementId);
            content.Impact = request.Impact ?? content.Impact;
            content.Measures = request.Measures ?? content.Measures;
            content.Status = request.Status ?? content.Status;
            if (request.Questions is not null)
            {
                content.Questions = [.. request.Questions
                    .Where(question => !string.IsNullOrWhiteSpace(question.Text))
                    .Select(question => new RequirementQuestion(string.IsNullOrWhiteSpace(question.Id) ? NewId("rq") : question.Id, question.Text.Trim()))];
            }
            return content;
        }
    }

    public LawList CreateLawList(SaveLawListRequest request)
    {
        lock (gate)
        {
            var list = new LawList
            {
                Id = Slug(request.Name),
                Name = string.IsNullOrWhiteSpace(request.Name) ? "Ny lovliste" : request.Name.Trim(),
                Description = request.Description?.Trim() ?? string.Empty,
                RequirementIds = [.. (request.RequirementIds ?? []).Where(id => register.Any(item => item.Id == id))]
            };
            lawLists.Add(list);
            return list;
        }
    }

    public LawList? UpdateLawList(string id, SaveLawListRequest request)
    {
        lock (gate)
        {
            var list = FindLawList(id);
            if (list is null) return null;
            if (!string.IsNullOrWhiteSpace(request.Name)) list.Name = request.Name.Trim();
            if (request.Description is not null) list.Description = request.Description.Trim();
            if (request.RequirementIds is not null)
                list.RequirementIds = [.. request.RequirementIds.Where(requirementId => register.Any(item => item.Id == requirementId))];
            return list;
        }
    }

    public bool DeleteLawList(string id)
    {
        lock (gate) return lawLists.RemoveAll(item => item.Id == id) > 0;
    }

    public Lck CreateLck(CreateLckRequest request)
    {
        lock (gate)
        {
            var tenantIds = (request.TenantIds ?? []).Where(id => FindTenant(id) is not null).Distinct().ToList();
            if (tenantIds.Count == 0) tenantIds = [Tenants[0].Id];

            var lck = new Lck
            {
                Id = NewId("lck"),
                Name = string.IsNullOrWhiteSpace(request.Name) ? "Ny LCK" : request.Name.Trim(),
                LawListId = request.LawListId,
                Status = "Klargjort",
                DueDate = request.DueDate ?? DateOnly.FromDateTime(DateTime.Today.AddDays(14)),
                TenantIds = tenantIds,
                AssigneeIds = [.. (request.AssigneeIds ?? []).Where(id => Users.Any(user => user.Id == id))],
                Settings = request.Settings ?? new LckSettings()
            };
            lcks.Add(lck);

            foreach (var tenantId in tenantIds)
                AddItems(lck, tenantId, request.RequirementIds ?? []);

            return lck;
        }
    }

    public Lck? SetStatus(string id, string status, string? comment)
    {
        if (!LckStatuses.Contains(status)) return null;

        lock (gate)
        {
            var lck = FindLck(id);
            if (lck is null) return null;

            lck.Status = status;
            if (status == "Lukket")
            {
                lck.ClosedAt = DateTimeOffset.UtcNow;
                lck.ClosedComment = comment;
            }
            else
            {
                lck.ClosedAt = null;
                lck.ClosedComment = null;
            }
            return lck;
        }
    }

    public bool DeleteLck(string id)
    {
        lock (gate) return lcks.RemoveAll(item => item.Id == id) > 0;
    }

    public LckQuestion? UpdateQuestion(string lckId, string itemId, string questionId, UpdateLckQuestionRequest request)
    {
        lock (gate)
        {
            var lck = FindLck(lckId);
            var question = lck?.Items.FirstOrDefault(item => item.Id == itemId)?.Questions.FirstOrDefault(item => item.Id == questionId);
            if (lck is null || question is null || lck.Status == "Lukket") return null;

            question.ResponderId = request.ResponderId ?? question.ResponderId;
            question.DeviationCause = request.DeviationCause ?? question.DeviationCause;
            question.Action = request.Action ?? question.Action;
            question.ResponsibleId = request.ResponsibleId ?? question.ResponsibleId;
            question.PlannedCompletionDate = request.PlannedCompletionDate ?? question.PlannedCompletionDate;
            question.ActionComment = request.ActionComment ?? question.ActionComment;
            question.ClosedDate = request.ClosedDate ?? question.ClosedDate;
            question.Documentation = request.Documentation ?? question.Documentation;
            question.RegisteredById = request.RegisteredById ?? question.RegisteredById;

            if (request.Answer is not null)
            {
                question.Answer = request.Answer;
                question.AnsweredAt = DateTimeOffset.UtcNow;
                if (lck.Status is "Klargjort" or "Sendt") lck.Status = "Pågår";
            }

            SyncDeviation(lck, question);
            return question;
        }
    }

    /// <summary>Spec §30: «Nei» oppretter avvik automatisk, «Delvis» kun når kontrollen er satt opp for det.</summary>
    private void SyncDeviation(Lck lck, LckQuestion question)
    {
        var item = lck.Items.FirstOrDefault(candidate => candidate.Questions.Contains(question));
        if (item is null) return;

        var shouldExist = question.Answer switch
        {
            "Nei" => lck.Settings.CreateDeviationOnNo,
            "Delvis" => lck.Settings.CreateDeviationOnPartial,
            _ => false
        };

        var existing = deviations.FirstOrDefault(deviation => deviation.QuestionId == question.Id);

        if (!shouldExist)
        {
            if (existing is { CreatedAutomatically: true, Status: "Åpent" }) deviations.Remove(existing);
            return;
        }

        if (existing is not null)
        {
            existing.Answer = question.Answer!;
            existing.Comment = question.DeviationCause;
            existing.Documentation = question.Documentation;
            existing.RespondentId = question.ResponderId;
            existing.ResponsibleId ??= question.ResponsibleId;
            existing.DueDate ??= question.PlannedCompletionDate;
            return;
        }

        deviations.Add(new Deviation
        {
            Id = NewId("dev"),
            TenantId = item.TenantId,
            LckId = lck.Id,
            ItemId = item.Id,
            QuestionId = question.Id,
            RequirementId = item.RequirementId,
            Answer = question.Answer!,
            RespondentId = question.ResponderId,
            Unit = Users.FirstOrDefault(user => user.Id == question.ResponderId)?.Unit ?? string.Empty,
            Comment = question.DeviationCause,
            Documentation = question.Documentation,
            RegisteredDate = DateOnly.FromDateTime(DateTime.Today),
            ResponsibleId = question.ResponsibleId,
            DueDate = question.PlannedCompletionDate,
            CreatedAutomatically = true
        });
    }

    public Deviation? UpdateDeviation(string id, UpdateDeviationRequest request)
    {
        lock (gate)
        {
            var deviation = deviations.FirstOrDefault(item => item.Id == id);
            if (deviation is null) return null;
            if (request.Status is not null && !DeviationStatuses.Contains(request.Status)) return null;

            deviation.Status = request.Status ?? deviation.Status;
            deviation.ResponsibleId = request.ResponsibleId ?? deviation.ResponsibleId;
            deviation.DueDate = request.DueDate ?? deviation.DueDate;
            deviation.Comment = request.Comment ?? deviation.Comment;
            deviation.Documentation = request.Documentation ?? deviation.Documentation;
            return deviation;
        }
    }

    /// <summary>Spec §32: tiltak kan opprettes fra LCK-svar, avvik, paragraf eller lovendring.</summary>
    public ActionItem CreateAction(CreateActionRequest request)
    {
        lock (gate)
        {
            var action = new ActionItem
            {
                Id = NewId("act"),
                TenantId = request.TenantId,
                SourceType = request.SourceType,
                SourceId = request.SourceId,
                RequirementId = request.RequirementId,
                Description = request.Description?.Trim() ?? string.Empty,
                ResponsibleId = request.ResponsibleId,
                DueDate = request.DueDate,
                Status = ActionStatuses.Contains(request.Status ?? string.Empty) ? request.Status! : ActionStatuses[0],
                Documentation = request.Documentation,
                Comment = request.Comment,
                CreatedAt = DateTimeOffset.UtcNow
            };
            actions.Add(action);
            return action;
        }
    }

    public ActionItem? UpdateAction(string id, UpdateActionRequest request)
    {
        lock (gate)
        {
            var action = actions.FirstOrDefault(item => item.Id == id);
            if (action is null) return null;
            if (request.Status is not null && !ActionStatuses.Contains(request.Status)) return null;

            action.Description = request.Description ?? action.Description;
            action.ResponsibleId = request.ResponsibleId ?? action.ResponsibleId;
            action.DueDate = request.DueDate ?? action.DueDate;
            action.Status = request.Status ?? action.Status;
            action.Documentation = request.Documentation ?? action.Documentation;
            action.Comment = request.Comment ?? action.Comment;
            return action;
        }
    }

    public bool DeleteAction(string id)
    {
        lock (gate) return actions.RemoveAll(item => item.Id == id) > 0;
    }

    public LegalChange? FindLegalChange(string id) => legalChanges.FirstOrDefault(item => item.Id == id);

    /// <summary>Tiltak is one concept: an LCK answer and its avvik resolve to the same action list.</summary>
    public IReadOnlyList<ActionItem> ActionsForQuestion(string questionId)
    {
        var deviationId = deviations.FirstOrDefault(item => item.QuestionId == questionId)?.Id;
        return [.. actions.Where(action => action.SourceId == questionId || (deviationId is not null && action.SourceId == deviationId))];
    }

    public IReadOnlyList<ActionItem> ActionsForDeviation(Deviation deviation) =>
        [.. actions.Where(action => action.SourceId == deviation.Id || action.SourceId == deviation.QuestionId)];

    /// <summary>Spec §51: forfalt når fristen har passert uten at alle spørsmål er besvart.</summary>
    public static bool IsOverdue(Lck lck) =>
        lck.Status is not ("Besvart" or "Til gjennomgang" or "Lukket")
        && lck.DueDate < DateOnly.FromDateTime(DateTime.Today)
        && lck.Items.SelectMany(item => item.Questions).Any(question => question.Answer is null);

    /// <summary>Spec §36: klassifisering av lovendringen gj\u00f8res per virksomhet.</summary>
    public LegalChangeHandling GetHandling(string changeId, string tenantId)
    {
        lock (gate)
        {
            var existing = legalChanges.FirstOrDefault(item => item.Id == changeId)?.Handlings.FirstOrDefault(item => item.TenantId == tenantId);
            if (existing is not null) return existing;

            var created = new LegalChangeHandling { TenantId = tenantId };
            FindLegalChange(changeId)?.Handlings.Add(created);
            return created;
        }
    }

    public LegalChangeHandling? UpdateHandling(string changeId, string tenantId, UpdateLegalChangeRequest request)
    {
        if (FindLegalChange(changeId) is null || FindTenant(tenantId) is null) return null;
        if (request.Status is not null && !LegalChangeStatuses.Contains(request.Status)) return null;

        lock (gate)
        {
            var handling = GetHandling(changeId, tenantId);
            handling.Status = request.Status ?? handling.Status;
            handling.Note = request.Note ?? handling.Note;
            handling.HandledAt = DateTimeOffset.UtcNow;
            return handling;
        }
    }

    /// <summary>Spec §24: Ja = 100, Delvis = 50, Nei = 0, «Ikke relevant» holdes utenfor beregningsgrunnlaget.</summary>
    public static double? ScoreOf(IEnumerable<LckQuestion> questions)
    {
        var scored = questions.Where(question => question.Answer is "Ja" or "Delvis" or "Nei").ToList();
        if (scored.Count == 0) return null;
        return Math.Round(scored.Average(question => question.Answer switch { "Ja" => 100d, "Delvis" => 50d, _ => 0d }), 1);
    }

    public IEnumerable<LckQuestion> QuestionsFor(string? tenantId = null, string? requirementId = null) =>
        lcks.SelectMany(lck => lck.Items)
            .Where(item => (tenantId is null || item.TenantId == tenantId) && (requirementId is null || item.RequirementId == requirementId))
            .SelectMany(item => item.Questions);

    private void AddItems(Lck lck, string tenantId, IReadOnlyList<string> requirementIds)
    {
        var position = lck.Items.Count(item => item.TenantId == tenantId);
        foreach (var requirementId in requirementIds)
        {
            if (FindRequirement(requirementId) is not { } requirement) continue;
            if (lck.Items.Any(item => item.TenantId == tenantId && item.RequirementId == requirementId)) continue;

            var content = GetContent(requirementId);
            position++;
            lck.Items.Add(new LckItem
            {
                Id = NewId("item"),
                TenantId = tenantId,
                RequirementId = requirement.Id,
                Index = $"01{position * 10:00}",
                DocumentName = requirement.LawName,
                Paragraphs = $"{requirement.Paragraph} {requirement.RequirementText}",
                RequirementSummary = content.Impact,
                Compliance = content.Measures,
                Questions = [.. content.Questions.Select(question => new LckQuestion { Id = NewId("q"), Text = question.Text })]
            });
        }
    }

    private static string NewId(string prefix) => $"{prefix}-{Guid.NewGuid():N}"[..(prefix.Length + 9)];

    private string Slug(string? name)
    {
        var basis = new string((name ?? "lovliste").ToLowerInvariant().Select(character => char.IsLetterOrDigit(character) ? character : '-').ToArray()).Trim('-');
        if (string.IsNullOrEmpty(basis)) basis = "lovliste";
        var candidate = basis;
        var suffix = 2;
        while (lawLists.Any(item => item.Id == candidate)) candidate = $"{basis}-{suffix++}";
        return candidate;
    }

    private void SeedContent()
    {
        Content("aml-2a-3", "Alle depoter, terminaler og verksteder må kjenne varslingsrutinen.",
            "Rutine for varsling. Landax ID: 29117. Fremgangsmåte er også beskrevet i sjåførhåndboken. Landax ID 43101", "Delvis samsvar",
            "Er varslingsrutinen gjennomgått med alle ansatte på avdelingen?");
        Content("aml-3-1", "Gjelder alle depoter, verksteder og administrative enheter.",
            "Årlig risikovurdering, vernerunder og lokal handlingsplan. Landax ID: 21044", "Samsvar",
            "Har avdelingen egne målsetninger for HMS?", "Følges tiltak fra risikovurderingen opp?");
        Content("aml-4-1", "Relevant for arbeidstid, ergonomi og sikkerhet for sjåfører og verkstedpersonell.",
            "Følge opp arbeidsmiljøkartlegging og verneombudets funn.", "Samsvar",
            "Er arbeidsmiljørisiko kartlagt og fulgt opp?");
        Content("aml-10-8", "Turnus må sikre lovpålagt hviletid mellom skift.",
            "Turnusplanlegging kontrolleres månedlig mot arbeidstidsbestemmelsene.", "Delvis samsvar",
            "Er turnusplanen kontrollert mot kravet til daglig arbeidsfri?");
        Content("ikf-5", "Krever dokumenterte rutiner ved verksteder, vaskehaller, terminaler og depoter.",
            "Vedlikeholde HMS-rutiner, opplæring og årlig ledelsesgjennomgang.", "Lovendring til vurdering",
            "Er HMS-rutiner gjort kjent for ansatte?", "Er dokumentasjonen oppdatert siste 12 måneder?");
        Content("ytl-4", "Alle rute- og transportområder må ha gyldig løyve.",
            "Løyveregister vedlikeholdes av transportsjef og kontrolleres kvartalsvis.", "Samsvar",
            "Er alle løyver gyldige for inneværende periode?");
        Content("khf-2", "Gjelder alle sjåfører i rute-, tur- og godskjøring.",
            "Fartsskriverdata lastes ned og analyseres hver 28. dag.", "Delvis samsvar",
            "Lastes fartsskriverdata ned innenfor lovpålagt intervall?", "Følges registrerte brudd opp med sjåfør?");
        Content("vtl-21", "Sjåfør skal være skikket, og kjøretøyet skal være i forsvarlig stand.",
            "Daglig kjøretøykontroll og rusmiddelpolicy med stikkprøver.", "Samsvar",
            "Gjennomføres daglig kjøretøykontroll før avgang?");
    }

    private void Content(string requirementId, string impact, string measures, string status, params string[] questions)
    {
        var content = GetContent(requirementId);
        content.Impact = impact;
        content.Measures = measures;
        content.Status = status;
        content.Questions = [.. questions.Select(text => new RequirementQuestion(NewId("rq"), text))];
    }

    private void SeedLawLists()
    {
        lawLists.AddRange(
        [
            new() { Id = "arbeidsmiljo", Name = "Arbeidsmiljø", Description = "HMS-krav for drift, depoter og verksteder", RequirementIds = ["aml-2a-3", "aml-3-1", "aml-4-1", "ikf-5"] },
            new() { Id = "norway-bus", Name = "Norway Bus", Description = "Lovkrav for rutedrift med buss i Norge", RequirementIds = ["ytl-4", "khf-2", "vtl-21", "aml-10-8"] },
            new() { Id = "transport-sikkerhet", Name = "Transport og sikkerhet", Description = "Løyve, kjøre- og hviletid og kjøretøykontroll", RequirementIds = ["ytl-4", "khf-2", "vtl-21"] },
            new() { Id = "internkontroll", Name = "Internkontroll", Description = "Dokumentasjonskrav for internkontroll", RequirementIds = ["ikf-5"] }
        ]);
    }

    private void SeedLcks()
    {
        var nordic = CreateLck(new CreateLckRequest(
            "LCK Arbeidsmiljø Q1 2027", "arbeidsmiljo", ["nordic-bus"],
            ["aml-2a-3", "aml-3-1", "ikf-5"], ["nils", "sara"],
            DateOnly.FromDateTime(DateTime.Today.AddDays(21)), new LckSettings()));

        Answer(nordic, "aml-2a-3", 0, "Nei", "nils",
            "Vi mangler å gjennomgå varslingsrutine med siste 5 nyansatte.",
            "Gjennomgå varslingsrutine for nyansatte.", "nils", new DateOnly(2026, 9, 1));
        Answer(nordic, "aml-3-1", 0, "Ja", "sara");
        Answer(nordic, "aml-3-1", 1, "Delvis", "sara", "Enkelte tiltak er ikke lukket.", "Lukke gjenstående tiltak.", "nils", new DateOnly(2026, 10, 1));

        var group = CreateLck(new CreateLckRequest(
            "Konsernkontroll trafikksikkerhet 2027", null, ["nordic-bus", "fjord-logistikk", "vestland-buss"],
            ["khf-2", "vtl-21"], ["nils", "erik", "jon"],
            DateOnly.FromDateTime(DateTime.Today.AddDays(30)), new LckSettings()));

        Answer(group, "khf-2", 0, "Delvis", "nils", tenantId: "nordic-bus");
        Answer(group, "vtl-21", 0, "Ja", "nils", tenantId: "nordic-bus");
        Answer(group, "khf-2", 0, "Nei", "erik", "Ukentlig analyse er ikke gjennomført siden mai.", "Etablere fast ukentlig analyse.", "erik", new DateOnly(2026, 9, 15), "fjord-logistikk");
        Answer(group, "vtl-21", 0, "Delvis", "erik", tenantId: "fjord-logistikk");
        Answer(group, "vtl-21", 0, "Ja", "jon", tenantId: "vestland-buss");
    }

    private void Answer(Lck lck, string requirementId, int questionIndex, string answer, string responderId,
        string? deviationCause = null, string? action = null, string? responsibleId = null, DateOnly? due = null, string? tenantId = null)
    {
        var item = lck.Items.FirstOrDefault(candidate => candidate.RequirementId == requirementId && (tenantId is null || candidate.TenantId == tenantId));
        if (item is null || item.Questions.Count <= questionIndex) return;

        var question = item.Questions[questionIndex];
        question.Answer = answer;
        question.ResponderId = responderId;
        question.DeviationCause = deviationCause;
        question.Action = action;
        question.ResponsibleId = responsibleId;
        question.PlannedCompletionDate = due;
        question.AnsweredAt = DateTimeOffset.UtcNow;
        lck.Status = "Pågår";
        SyncDeviation(lck, question);

        if (action is not null)
        {
            var deviation = deviations.FirstOrDefault(candidate => candidate.QuestionId == question.Id);
            CreateAction(new CreateActionRequest(
                item.TenantId,
                deviation is null ? "LCK-svar" : "Avvik",
                deviation?.Id ?? question.Id,
                item.RequirementId,
                action,
                responsibleId,
                due,
                null,
                null,
                null));
        }
    }

    private void SeedAccess()
    {
        void Access(string userId, string level, params string[] permissions)
        {
            if (FindUser(userId) is not { } user) return;
            user.AccessLevel = level;
            user.Permissions = [.. permissions];
        }

        Access("ingrid", "Systemadministrator", PermissionOptions);
        Access("nils", "Avdelingsleder", "Lovlister", "LCK", "Avvik og tiltak", "Rapporter");
        Access("sara", "Respondent", "LCK", "Avvik og tiltak");
        Access("tom", "Respondent", "LCK");
        Access("erik", "Virksomhetsadministrator", "Lovregister", "Lovlister", "LCK", "Avvik og tiltak", "Lovendringer", "Rapporter");
        Access("mari", "Avdelingsleder", "LCK", "Avvik og tiltak");
        Access("jon", "Virksomhetsadministrator", "Lovregister", "Lovlister", "LCK", "Avvik og tiltak", "Rapporter", "Brukeradministrasjon");
        Access("lise", "Respondent", "LCK");
    }

    private void SeedLegalChanges()
    {
        legalChanges.Add(new LegalChange
        {
            Id = "change-ikf-5",
            RequirementId = "ikf-5",
            DetectedDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-12)),
            EffectiveDate = new DateOnly(2027, 1, 1),
            PreviousText = "Internkontrollen skal dokumenteres i den form og det omfang som er nødvendig på bakgrunn av virksomhetens art.",
            NewText = "Internkontrollen skal dokumenteres og tilpasses virksomhetens art, aktiviteter og risikoforhold, og gjennomgås minst én gang i året.",
            Summary = "Kravet er utvidet med en eksplisitt plikt til årlig gjennomgang, og dokumentasjonen skal tilpasses risikoforhold i tillegg til virksomhetens art.",
            BusinessImpact = "Virksomheter med verksted, depot og terminaldrift må kunne dokumentere en årlig gjennomgang av internkontrollen per lokasjon, ikke bare sentralt.",
            Example = "Et depot som kun har oppdatert HMS-permen ved behov må nå kunne vise til en datert årlig gjennomgang med referat og ansvarlig.",
            RecommendedAction = "Legg årlig gjennomgang inn i HMS-årshjulet, oppdater kontrollspørsmålet om dokumentasjon og send ny LCK til lokasjonsledere."
        });

        legalChanges.Add(new LegalChange
        {
            Id = "change-khf-2",
            RequirementId = "khf-2",
            DetectedDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-4)),
            EffectiveDate = new DateOnly(2026, 11, 1),
            PreviousText = "Fører skal registrere kjøre- og hviletid i fartsskriver, og data skal lastes ned regelmessig.",
            NewText = "Fører skal registrere kjøre- og hviletid i fartsskriver. Data skal lastes ned minst hver 28. dag og oppbevares i minst 12 måneder.",
            Summary = "Nedlastingsintervallet er nå tallfestet til 28 dager, og oppbevaringstiden er satt til minst 12 måneder.",
            BusinessImpact = "Rutiner som i dag beskriver «regelmessig» nedlasting må tallfestes, og arkivrutinen for fartsskriverdata må dokumenteres.",
            Example = "En avdeling som laster ned data kvartalsvis vil bryte kravet og må legge om til månedlig nedlasting.",
            RecommendedAction = "Oppdater tiltaksbeskrivelsen med 28-dagersintervall og opprett tiltak for arkivering i 12 måneder."
        });
    }
}

public sealed record Tenant(string Id, string Name, string Industry, string Description, IReadOnlyList<string> Units);

/// <summary>Demo-bruker med redigerbar rolle, enhet og tilgangsnivå.</summary>
public sealed class DemoUser(string id, string tenantId, string name, string role, string unit, string email)
{
    public string Id { get; } = id;
    public string TenantId { get; } = tenantId;
    public string Name { get; set; } = name;
    public string Role { get; set; } = role;
    public string Unit { get; set; } = unit;
    public string Email { get; set; } = email;
    public string AccessLevel { get; set; } = "Respondent";
    public List<string> Permissions { get; set; } = [];
    public bool Active { get; set; } = true;
}

public sealed record LawRequirement(string Id, string Area, string LawName, string DokId, string RefId, string Paragraph, string RequirementText, string ChangeStatus);
public sealed record RequirementQuestion(string Id, string Text);

public sealed class RequirementContent
{
    public required string RequirementId { get; init; }
    public string Impact { get; set; } = string.Empty;
    public string Measures { get; set; } = string.Empty;
    public string Status { get; set; } = "Ikke vurdert";
    public IReadOnlyList<RequirementQuestion> Questions { get; set; } = [];
}

public sealed class LawList
{
    public required string Id { get; init; }
    public required string Name { get; set; }
    public required string Description { get; set; }
    public List<string> RequirementIds { get; set; } = [];
}

public sealed class Lck
{
    public required string Id { get; init; }
    public required string Name { get; set; }
    public string? LawListId { get; init; }
    public required string Status { get; set; }
    public required DateOnly DueDate { get; set; }
    public DateOnly CreatedDate { get; init; } = DateOnly.FromDateTime(DateTime.Today);
    public DateTimeOffset? ClosedAt { get; set; }
    public string? ClosedComment { get; set; }
    public List<string> TenantIds { get; set; } = [];
    public List<string> AssigneeIds { get; set; } = [];
    public LckSettings Settings { get; set; } = new();
    public List<LckItem> Items { get; } = [];
}

public sealed record LckSettings(bool RequireCommentOnNo = true, bool RequireCommentOnPartial = true, bool RequireReasonOnNotRelevant = false, bool AllowAttachments = true, bool SendReminders = true, bool CreateDeviationOnNo = true, bool CreateDeviationOnPartial = false);

public sealed class Deviation
{
    public required string Id { get; init; }
    public required string TenantId { get; init; }
    public required string LckId { get; init; }
    public required string ItemId { get; init; }
    public required string QuestionId { get; init; }
    public required string RequirementId { get; init; }
    public required string Answer { get; set; }
    public string? RespondentId { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public string? Documentation { get; set; }
    public required DateOnly RegisteredDate { get; init; }
    public string? ResponsibleId { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "Åpent";
    public bool CreatedAutomatically { get; init; }
}

public sealed class ActionItem
{
    public required string Id { get; init; }
    public required string TenantId { get; init; }
    public required string SourceType { get; init; }
    public string? SourceId { get; init; }
    public string? RequirementId { get; init; }
    public required string Description { get; set; }
    public string? ResponsibleId { get; set; }
    public DateOnly? DueDate { get; set; }
    public required string Status { get; set; }
    public string? Documentation { get; set; }
    public string? Comment { get; set; }
    public required DateTimeOffset CreatedAt { get; init; }
}

public sealed class LegalChange
{
    public required string Id { get; init; }
    public required string RequirementId { get; init; }
    public required DateOnly DetectedDate { get; init; }
    public required DateOnly EffectiveDate { get; init; }
    public required string PreviousText { get; init; }
    public required string NewText { get; init; }
    public required string Summary { get; init; }
    public required string BusinessImpact { get; init; }
    public required string Example { get; init; }
    public required string RecommendedAction { get; init; }
    /// <summary>Spec §40: AI-generert innhold skal merkes.</summary>
    public bool AiGenerated { get; init; } = true;
    public List<LegalChangeHandling> Handlings { get; } = [];
}

public sealed class LegalChangeHandling
{
    public required string TenantId { get; init; }
    public string Status { get; set; } = "Ikke vurdert";
    public string? Note { get; set; }
    public DateTimeOffset? HandledAt { get; set; }
}

public sealed class LckItem
{
    public required string Id { get; init; }
    public required string TenantId { get; init; }
    public required string RequirementId { get; init; }
    public required string Index { get; set; }
    public required string DocumentName { get; set; }
    public required string Paragraphs { get; set; }
    public required string RequirementSummary { get; set; }
    public required string Compliance { get; set; }
    public List<LckQuestion> Questions { get; init; } = [];
}

public sealed class LckQuestion
{
    public required string Id { get; init; }
    public required string Text { get; set; }
    public string? ResponderId { get; set; }
    public string? Answer { get; set; }
    public string? DeviationCause { get; set; }
    public string? Action { get; set; }
    public string? ResponsibleId { get; set; }
    public DateOnly? PlannedCompletionDate { get; set; }
    public string? ActionComment { get; set; }
    public DateOnly? ClosedDate { get; set; }
    public string? Documentation { get; set; }
    public string? RegisteredById { get; set; }
    public DateTimeOffset? AnsweredAt { get; set; }
}

public sealed record UpdateContentRequest(string? Impact, string? Measures, string? Status, IReadOnlyList<RequirementQuestion>? Questions);
public sealed record SaveLawListRequest(string? Name, string? Description, IReadOnlyList<string>? RequirementIds);
public sealed record CreateLckRequest(string? Name, string? LawListId, IReadOnlyList<string>? TenantIds, IReadOnlyList<string>? RequirementIds, IReadOnlyList<string>? AssigneeIds, DateOnly? DueDate, LckSettings? Settings);
public sealed record UpdateLckQuestionRequest(string? ResponderId, string? Answer, string? DeviationCause, string? Action, string? ResponsibleId, DateOnly? PlannedCompletionDate, string? ActionComment, DateOnly? ClosedDate, string? Documentation, string? RegisteredById);
public sealed record SetLckStatusRequest(string Status, string? Comment);
public sealed record UpdateDeviationRequest(string? Status, string? ResponsibleId, DateOnly? DueDate, string? Comment, string? Documentation);
public sealed record CreateActionRequest(string TenantId, string SourceType, string? SourceId, string? RequirementId, string? Description, string? ResponsibleId, DateOnly? DueDate, string? Status, string? Documentation, string? Comment);
public sealed record UpdateActionRequest(string? Description, string? ResponsibleId, DateOnly? DueDate, string? Status, string? Documentation, string? Comment);
public sealed record UpdateLegalChangeRequest(string? Status, string? Note);
public sealed record UpdateUserRequest(string? Role, string? Unit, string? AccessLevel, IReadOnlyList<string>? Permissions, bool? Active);
