using LovdataPocApi.Infrastructure.Lovdata;

namespace LovdataPocApi.Features.Compliance;

public static class ComplianceEndpoints
{
    private static readonly string[] AnswerOptions = ["Ja", "Delvis", "Nei", "Ikke relevant"];

    public static void MapComplianceApi(this WebApplication app)
    {
        var api = app.MapGroup("/api").WithTags("Compliance MVP");

        api.MapGet("/tenants", (ComplianceStore store) => Results.Ok(store.Tenants.Select(tenant => TenantSummary(store, tenant))));

        // Spec: virksomhetskort med organisasjon (avdelinger) og tilhørende brukere.
        api.MapGet("/tenants/{id}", (string id, ComplianceStore store) =>
        {
            var tenant = store.FindTenant(id);
            if (tenant is null) return Results.NotFound();

            var questions = store.QuestionsFor(tenant.Id).ToList();
            var tenantUsers = store.Users.Where(user => user.TenantId == tenant.Id).ToList();
            var tenantDeviations = store.Deviations.Where(deviation => deviation.TenantId == tenant.Id).ToList();
            var tenantActions = store.Actions.Where(action => action.TenantId == tenant.Id).ToList();
            var tenantLcks = store.Lcks.Where(lck => lck.TenantIds.Contains(tenant.Id)).ToList();

            return Results.Ok(new
            {
                tenant.Id,
                tenant.Name,
                tenant.Industry,
                tenant.Description,
                units = tenant.Units,
                compliance = ComplianceStore.ScoreOf(questions),
                questionCount = questions.Count,
                answeredCount = questions.Count(question => question.Answer is not null),
                openDeviations = tenantDeviations.Count(deviation => deviation.Status != "Lukket"),
                openActions = tenantActions.Count(action => action.Status is not ("Fullført" or "Verifisert")),
                userCount = tenantUsers.Count,
                lckCount = tenantLcks.Count,
                accessLevels = ComplianceStore.AccessLevels,
                permissionOptions = ComplianceStore.PermissionOptions,
                unitRows = tenant.Units.Select(unit => new
                {
                    name = unit,
                    users = tenantUsers.Count(user => user.Unit == unit),
                    respondents = tenantUsers.Count(user => user.Unit == unit && user.AccessLevel == "Respondent"),
                    openDeviations = tenantDeviations.Count(deviation => deviation.Unit == unit && deviation.Status != "Lukket"),
                    deviations = tenantDeviations.Count(deviation => deviation.Unit == unit),
                    score = ComplianceStore.ScoreOf(UnitQuestions(store, tenant.Id, unit))
                }),
                users = tenantUsers.Select(user => UserView(store, user)),
                lcks = tenantLcks.Select(lck => LckSummary(store, lck, tenant.Id)),
                legalChangesToHandle = store.LegalChanges.Count(change => store.GetHandling(change.Id, tenant.Id).Status is "Ikke vurdert" or "Under vurdering" or "Krever tiltak")
            });
        });


        // Spec §25: aggregated compliance across the selected tenants.
        api.MapGet("/overview", (string? tenantIds, ComplianceStore store) =>
        {
            var selected = Split(tenantIds) is { Count: > 0 } ids
                ? store.Tenants.Where(tenant => ids.Contains(tenant.Id)).ToList()
                : [.. store.Tenants];

            var questions = selected.SelectMany(tenant => store.QuestionsFor(tenant.Id)).ToList();
            return Results.Ok(new
            {
                tenants = selected.Select(tenant => TenantSummary(store, tenant)),
                selectedTenantIds = selected.Select(tenant => tenant.Id),
                totalCompliance = ComplianceStore.ScoreOf(questions),
                controlledRequirements = selected.SelectMany(tenant => store.Lcks.SelectMany(lck => lck.Items).Where(item => item.TenantId == tenant.Id)).Select(item => item.RequirementId).Distinct().Count(),
                answered = questions.Count(question => question.Answer is not null),
                questions = questions.Count,
                openDeviations = questions.Count(question => question.Answer is "Nei" or "Delvis" && question.ClosedDate is null),
                notRelevant = questions.Count(question => question.Answer == "Ikke relevant"),
                legalChanges = store.Register.Count(item => item.ChangeStatus == "Ny lovendring")
            });
        });

        api.MapGet("/users", (string? tenantId, ComplianceStore store) =>
            Results.Ok((tenantId is null ? store.Users : store.Users.Where(user => user.TenantId == tenantId)).Select(user => UserView(store, user))));

        api.MapPatch("/users/{id}", (string id, UpdateUserRequest request, ComplianceStore store) =>
            store.UpdateUser(id, request) is { } user ? Results.Ok(UserView(store, user)) : Results.NotFound());

        api.MapGet("/access-options", () => Results.Ok(new { accessLevels = ComplianceStore.AccessLevels, permissionOptions = ComplianceStore.PermissionOptions }));

        // Endringsstatus «Ny lovendring» følges av en kort endringstekst fra lovendringen.
        api.MapGet("/law-register", (ComplianceStore store) => Results.Ok(store.Register.Select(requirement =>
        {
            var change = store.LegalChangeFor(requirement.Id);
            return new
            {
                requirement.Id,
                requirement.Area,
                requirement.LawName,
                requirement.DokId,
                requirement.RefId,
                requirement.Paragraph,
                requirement.RequirementText,
                requirement.ChangeStatus,
                changeSummary = change?.Summary,
                changeEffectiveDate = change?.EffectiveDate,
                changeDetectedDate = change?.DetectedDate,
                changePreviousText = change?.PreviousText,
                changeNewText = change?.NewText,
                changeBusinessImpact = change?.BusinessImpact,
                changeAiGenerated = change?.AiGenerated ?? false
            };
        })));

        // Scope is global when no tenant is supplied, otherwise the detailed view for the selected tenants.
        api.MapGet("/dashboard", (string? tenantIds, ComplianceStore store) =>
        {
            var scope = Scope(store, tenantIds);
            var questions = scope.SelectMany(id => store.QuestionsFor(id)).ToList();
            var requirements = store.LawLists
                .SelectMany(list => list.RequirementIds)
                .Distinct()
                .Select(store.FindRequirement).OfType<LawRequirement>()
                .ToList();

            return Results.Ok(new
            {
                tenantIds = scope,
                tenantNames = scope.Select(id => store.FindTenant(id)?.Name ?? id),
                isGlobal = scope.Count == store.Tenants.Count,
                totalCompliance = ComplianceStore.ScoreOf(questions),
                controlledRequirements = requirements.Count,
                notRelevant = questions.Count(question => question.Answer == "Ikke relevant"),
                partiallyCompliant = questions.Count(question => question.Answer == "Delvis"),
                nonCompliant = questions.Count(question => question.Answer == "Nei"),
                openDeviations = questions.Count(question => question.Answer is "Nei" or "Delvis" && question.ClosedDate is null),
                unansweredQuestions = questions.Count(question => question.Answer is null),
                legalChangesToReview = requirements.Count(item => item.ChangeStatus == "Ny lovendring"),
                byTenant = scope.Select(id => new
                {
                    tenantId = id,
                    name = store.FindTenant(id)?.Name ?? id,
                    score = ComplianceStore.ScoreOf(store.QuestionsFor(id))
                }),
                byArea = requirements
                    .GroupBy(item => item.Area)
                    .Select(group => new { name = group.Key, score = ComplianceStore.ScoreOf(QuestionsIn(store, scope, group)) }),
                byLawList = store.LawLists.Select(list => new
                {
                    list.Id,
                    list.Name,
                    score = ComplianceStore.ScoreOf(scope.SelectMany(tenantId => list.RequirementIds.SelectMany(id => store.QuestionsFor(tenantId, id))))
                }),
                byLaw = requirements
                    .GroupBy(item => item.LawName)
                    .Select(group =>
                    {
                        var lawQuestions = QuestionsIn(store, scope, group).ToList();
                        return new
                        {
                            lawName = group.Key,
                            dokId = group.First().DokId,
                            paragraphs = group.Count(),
                            areas = group.Select(item => item.Area).Distinct(),
                            hasLegalChange = group.Any(item => item.ChangeStatus == "Ny lovendring"),
                            score = ComplianceStore.ScoreOf(lawQuestions),
                            questionCount = lawQuestions.Count,
                            answeredCount = lawQuestions.Count(question => question.Answer is not null),
                            openDeviations = lawQuestions.Count(question => question.Answer is "Nei" or "Delvis" && question.ClosedDate is null),
                            lckCount = store.Lcks.Count(lck => lck.Items.Any(item => scope.Contains(item.TenantId) && group.Any(requirement => requirement.Id == item.RequirementId)))
                        };
                    })
                    .OrderBy(row => row.lawName)
            });
        });

        api.MapGet("/law-lists", (ComplianceStore store) => Results.Ok(store.LawLists.Select(list => LawListSummary(store, list))));

        api.MapPost("/law-lists", (SaveLawListRequest request, ComplianceStore store) =>
        {
            var list = store.CreateLawList(request);
            return Results.Created($"/api/law-lists/{list.Id}", list);
        });

        api.MapGet("/law-lists/{id}", (string id, string? tenantIds, ComplianceStore store) =>
        {
            var list = store.FindLawList(id);
            if (list is null) return Results.NotFound();
            var scope = Split(tenantIds) is { Count: > 0 } ids ? ids : [.. store.Tenants.Select(tenant => tenant.Id)];
            return Results.Ok(new { list, rows = Rows(store, list, scope) });
        });

        api.MapPatch("/law-lists/{id}", (string id, SaveLawListRequest request, ComplianceStore store) =>
            store.UpdateLawList(id, request) is { } list ? Results.Ok(list) : Results.NotFound());

        api.MapDelete("/law-lists/{id}", (string id, ComplianceStore store) =>
            store.DeleteLawList(id) ? Results.NoContent() : Results.NotFound());

        api.MapPatch("/requirements/{requirementId}/content", (string requirementId, UpdateContentRequest request, ComplianceStore store) =>
            store.UpdateContent(requirementId, request) is { } content ? Results.Ok(content) : Results.NotFound());

        var lcks = api.MapGroup("/lcks");

        lcks.MapGet("/", (string? tenantId, string? lawName, ComplianceStore store) =>
        {
            var lawRequirementIds = lawName is null
                ? null
                : store.Register.Where(item => item.LawName == lawName).Select(item => item.Id).ToHashSet();

            return Results.Ok(store.Lcks
                .Where(lck => tenantId is null || lck.TenantIds.Contains(tenantId))
                .Where(lck => lawRequirementIds is null || lck.Items.Any(item => lawRequirementIds.Contains(item.RequirementId)))
                .Select(lck => LckSummary(store, lck, tenantId, lawRequirementIds)));
        });

        lcks.MapGet("/{id}", (string id, ComplianceStore store) =>
        {
            var lck = store.FindLck(id);
            if (lck is null) return Results.NotFound();
            return Results.Ok(new
            {
                lck.Id,
                lck.Name,
                lck.Status,
                lck.DueDate,
                lck.ClosedAt,
                lck.ClosedComment,
                isClosed = lck.Status == "Lukket",
                isOverdue = ComplianceStore.IsOverdue(lck),
                statusOptions = ComplianceStore.LckStatuses,
                actionStatusOptions = ComplianceStore.ActionStatuses,
                lck.LawListId,
                lck.TenantIds,
                lck.AssigneeIds,
                lck.Settings,
                answerOptions = AnswerOptions,
                totalCompliance = ComplianceStore.ScoreOf(lck.Items.SelectMany(item => item.Questions)),
                groups = lck.TenantIds.Select(tenantId => new
                {
                    tenantId,
                    tenantName = store.FindTenant(tenantId)?.Name ?? tenantId,
                    score = ComplianceStore.ScoreOf(lck.Items.Where(item => item.TenantId == tenantId).SelectMany(item => item.Questions)),
                    items = lck.Items.Where(item => item.TenantId == tenantId).Select(item => new
                    {
                        item.Id,
                        item.TenantId,
                        item.RequirementId,
                        item.Index,
                        item.DocumentName,
                        item.Paragraphs,
                        item.RequirementSummary,
                        item.Compliance,
                        questions = item.Questions.Select(question => new
                        {
                            question.Id,
                            question.Text,
                            question.ResponderId,
                            question.Answer,
                            question.DeviationCause,
                            question.Action,
                            question.ResponsibleId,
                            question.PlannedCompletionDate,
                            question.ActionComment,
                            question.ClosedDate,
                            question.Documentation,
                            question.RegisteredById,
                            question.AnsweredAt,
                            deviationId = store.Deviations.FirstOrDefault(deviation => deviation.QuestionId == question.Id)?.Id,
                            actions = store.ActionsForQuestion(question.Id).Select(action => ActionView(store, action))
                        })
                    })
                })
            });
        });

        lcks.MapPost("/", (CreateLckRequest request, ComplianceStore store) =>
        {
            var lck = store.CreateLck(request);
            return Results.Created($"/api/lcks/{lck.Id}", new { lck.Id });
        });

        lcks.MapPost("/{id}/status", (string id, SetLckStatusRequest request, ComplianceStore store) =>
        {
            if (!ComplianceStore.LckStatuses.Contains(request.Status))
                return Results.BadRequest(new { message = $"Ukjent status: {request.Status}" });

            return store.SetStatus(id, request.Status, request.Comment) is { } lck
                ? Results.Ok(new { lck.Id, lck.Status, lck.ClosedAt, lck.ClosedComment })
                : Results.NotFound();
        });

        lcks.MapDelete("/{id}", (string id, ComplianceStore store) =>
            store.DeleteLck(id) ? Results.NoContent() : Results.NotFound());

        lcks.MapPatch("/{id}/items/{itemId}/questions/{questionId}", (string id, string itemId, string questionId, UpdateLckQuestionRequest request, ComplianceStore store) =>
        {
            if (store.FindLck(id) is { Status: "Lukket" })
                return Results.Conflict(new { message = "Kontrollen er lukket. Gjenåpne den for å registrere endringer." });

            return store.UpdateQuestion(id, itemId, questionId, request) is { } question ? Results.Ok(question) : Results.NotFound();
        });

        // Spec §30-31: avvik utledes fra LCK-svar og følges opp med ansvarlig, frist og status.
        api.MapGet("/deviations", (string? tenantIds, string? status, ComplianceStore store) =>
        {
            var scope = Scope(store, tenantIds);
            return Results.Ok(new
            {
                statusOptions = ComplianceStore.DeviationStatuses,
                items = store.Deviations
                    .Where(deviation => scope.Contains(deviation.TenantId))
                    .Where(deviation => status is null || deviation.Status == status)
                    .OrderBy(deviation => deviation.Status == "Lukket")
                    .ThenBy(deviation => deviation.DueDate ?? DateOnly.MaxValue)
                    .Select(deviation => DeviationView(store, deviation))
            });
        });

        api.MapPatch("/deviations/{id}", (string id, UpdateDeviationRequest request, ComplianceStore store) =>
            store.UpdateDeviation(id, request) is { } deviation ? Results.Ok(DeviationView(store, deviation)) : Results.NotFound());

        // Spec §32
        api.MapGet("/actions", (string? tenantIds, string? sourceId, ComplianceStore store) =>
        {
            var scope = Scope(store, tenantIds);
            return Results.Ok(new
            {
                statusOptions = ComplianceStore.ActionStatuses,
                items = store.Actions
                    .Where(action => scope.Contains(action.TenantId))
                    .Where(action => sourceId is null || action.SourceId == sourceId)
                    .OrderBy(action => action.DueDate ?? DateOnly.MaxValue)
                    .Select(action => ActionView(store, action))
            });
        });

        api.MapPost("/actions", (CreateActionRequest request, ComplianceStore store) =>
        {
            if (store.FindTenant(request.TenantId) is null) return Results.BadRequest(new { message = "Ukjent virksomhet." });
            var action = store.CreateAction(request);
            return Results.Created($"/api/actions/{action.Id}", ActionView(store, action));
        });

        api.MapPatch("/actions/{id}", (string id, UpdateActionRequest request, ComplianceStore store) =>
            store.UpdateAction(id, request) is { } action ? Results.Ok(ActionView(store, action)) : Results.NotFound());

        api.MapDelete("/actions/{id}", (string id, ComplianceStore store) =>
            store.DeleteAction(id) ? Results.NoContent() : Results.NotFound());

        // Spec §33-37
        api.MapGet("/legal-changes", (string? tenantIds, ComplianceStore store) =>
        {
            var scope = Scope(store, tenantIds);
            return Results.Ok(new
            {
                statusOptions = ComplianceStore.LegalChangeStatuses,
                items = store.LegalChanges.Select(change => LegalChangeView(store, change, scope))
            });
        });

        api.MapPatch("/legal-changes/{id}/handling/{tenantId}", (string id, string tenantId, UpdateLegalChangeRequest request, ComplianceStore store) =>
            store.UpdateHandling(id, tenantId, request) is { } handling ? Results.Ok(handling) : Results.NotFound());

        // Spec §28: kort hovedrapport på tvers av virksomheter – uten score per paragraf og uten LCK-svar.
        api.MapGet("/reports/overview", (string? tenantIds, ComplianceStore store) =>
        {
            var scope = Scope(store, tenantIds);
            var questions = scope.SelectMany(id => store.QuestionsFor(id)).ToList();
            var scopedDeviations = store.Deviations.Where(deviation => scope.Contains(deviation.TenantId)).ToList();

            return Results.Ok(new
            {
                tenantIds = scope,
                tenantNames = scope.Select(id => store.FindTenant(id)?.Name ?? id),
                isGlobal = scope.Count == store.Tenants.Count,
                totalCompliance = ComplianceStore.ScoreOf(questions),
                questionCount = questions.Count,
                answeredCount = questions.Count(question => question.Answer is not null),
                responseRate = questions.Count == 0 ? 0 : Math.Round(100d * questions.Count(question => question.Answer is not null) / questions.Count, 1),
                controlledRequirements = store.Lcks.SelectMany(lck => lck.Items).Where(item => scope.Contains(item.TenantId)).Select(item => item.RequirementId).Distinct().Count(),
                openDeviations = scopedDeviations.Count(deviation => deviation.Status != "Lukket"),
                closedDeviations = scopedDeviations.Count(deviation => deviation.Status == "Lukket"),
                answers = AnswerCounts(questions),
                byTenant = scope.Select(tenantId => new
                {
                    tenantId,
                    name = store.FindTenant(tenantId)?.Name ?? tenantId,
                    score = ComplianceStore.ScoreOf(store.QuestionsFor(tenantId))
                }),
                byArea = store.Lcks
                    .SelectMany(lck => lck.Items.Where(item => scope.Contains(item.TenantId)))
                    .GroupBy(item => store.FindRequirement(item.RequirementId)?.Area ?? "Ukjent")
                    .Select(group => new { name = group.Key, score = ComplianceStore.ScoreOf(group.SelectMany(item => item.Questions)) })
                    .OrderBy(row => row.name),
                lcks = store.Lcks
                    .Where(lck => lck.TenantIds.Any(scope.Contains))
                    .Select(lck =>
                    {
                        var items = lck.Items.Where(item => scope.Contains(item.TenantId)).ToList();
                        var lckQuestions = items.SelectMany(item => item.Questions).ToList();
                        return new
                        {
                            lck.Id,
                            lck.Name,
                            lck.Status,
                            lck.DueDate,
                            periodFrom = lck.CreatedDate,
                            periodTo = lck.ClosedAt is { } closed ? DateOnly.FromDateTime(closed.Date) : lck.DueDate,
                            tenantNames = lck.TenantIds.Where(scope.Contains).Select(id => store.FindTenant(id)?.Name ?? id),
                            questionCount = lckQuestions.Count,
                            answeredCount = lckQuestions.Count(question => question.Answer is not null),
                            responseRate = lckQuestions.Count == 0 ? 0 : Math.Round(100d * lckQuestions.Count(question => question.Answer is not null) / lckQuestions.Count, 1),
                            compliance = ComplianceStore.ScoreOf(lckQuestions),
                            deviations = scopedDeviations.Count(deviation => deviation.LckId == lck.Id)
                        };
                    })
            });
        });

        // Spec §29: LCK-sluttrapport.
        api.MapGet("/reports/lcks/{id}", (string id, string? tenantIds, ComplianceStore store) =>
        {
            var lck = store.FindLck(id);
            if (lck is null) return Results.NotFound();

            var scope = Split(tenantIds) is { Count: > 0 } ids ? ids.Where(lck.TenantIds.Contains).ToList() : lck.TenantIds;
            var items = lck.Items.Where(item => scope.Contains(item.TenantId)).ToList();
            var questions = items.SelectMany(item => item.Questions).ToList();

            IEnumerable<object> WithAnswer(string answer) => items
                .SelectMany(item => item.Questions.Where(question => question.Answer == answer).Select(question => new
                {
                    tenantName = store.FindTenant(item.TenantId)?.Name ?? item.TenantId,
                    law = store.FindRequirement(item.RequirementId)?.LawName,
                    paragraph = store.FindRequirement(item.RequirementId)?.Paragraph,
                    question = question.Text,
                    respondent = store.Users.FirstOrDefault(user => user.Id == question.ResponderId)?.Name,
                    comment = question.DeviationCause,
                    actionComment = question.ActionComment,
                    documentation = question.Documentation
                }));

            return Results.Ok(new
            {
                lck.Id,
                lck.Name,
                lck.Status,
                lck.DueDate,
                lck.ClosedAt,
                periodFrom = lck.CreatedDate,
                periodTo = lck.ClosedAt is { } closed ? DateOnly.FromDateTime(closed.Date) : lck.DueDate,
                respondents = lck.AssigneeIds.Select(assigneeId => store.Users.FirstOrDefault(user => user.Id == assigneeId))
                    .OfType<DemoUser>()
                    .Select(user => new { user.Id, user.Name, user.Role, user.Unit, tenant = store.FindTenant(user.TenantId)?.Name }),
                questionCount = questions.Count,
                answeredCount = questions.Count(question => question.Answer is not null),
                responseRate = questions.Count == 0 ? 0 : Math.Round(100d * questions.Count(question => question.Answer is not null) / questions.Count, 1),
                totalCompliance = ComplianceStore.ScoreOf(questions),
                answers = AnswerCounts(questions),
                deviationsByStatus = ComplianceStore.DeviationStatuses.Select(status => new
                {
                    status,
                    count = store.Deviations.Count(deviation => deviation.LckId == lck.Id && scope.Contains(deviation.TenantId) && deviation.Status == status)
                }),
                byTenant = scope.Select(tenantId => new
                {
                    tenantId,
                    name = store.FindTenant(tenantId)?.Name ?? tenantId,
                    score = ComplianceStore.ScoreOf(items.Where(item => item.TenantId == tenantId).SelectMany(item => item.Questions))
                }),
                byArea = items
                    .GroupBy(item => store.FindRequirement(item.RequirementId)?.Area ?? "Ukjent")
                    .Select(group => new { name = group.Key, score = ComplianceStore.ScoreOf(group.SelectMany(item => item.Questions)) }),
                byRequirement = items
                    .GroupBy(item => item.RequirementId)
                    .Select(group => new
                    {
                        requirementId = group.Key,
                        law = store.FindRequirement(group.Key)?.LawName,
                        paragraph = store.FindRequirement(group.Key)?.Paragraph,
                        score = ComplianceStore.ScoreOf(group.SelectMany(item => item.Questions))
                    }),
                partial = WithAnswer("Delvis"),
                nonCompliant = WithAnswer("Nei"),
                notRelevant = WithAnswer("Ikke relevant"),
                deviations = store.Deviations.Where(deviation => deviation.LckId == lck.Id && scope.Contains(deviation.TenantId)).Select(deviation => DeviationView(store, deviation))
            });
        });

        api.MapGet("/lovdata/search", async (string query, ILovdataClient lovdata, CancellationToken cancellationToken) =>
        {
            try { return Results.Ok(await lovdata.SearchAsync(query, cancellationToken: cancellationToken)); }
            catch (LovdataApiException exception) { return Results.Problem(exception.Message, statusCode: StatusCodes.Status502BadGateway); }
        });
        api.MapGet("/lovdata/document", async (string dokId, ILovdataClient lovdata, CancellationToken cancellationToken) =>
        {
            var document = await lovdata.GetDocumentAsync(dokId, cancellationToken);
            return document is null ? Results.NotFound() : Results.Ok(document);
        });
        api.MapGet("/lovdata/render", async (string refId, ILovdataClient lovdata, CancellationToken cancellationToken) =>
        {
            var document = await lovdata.RenderDocumentAsync(refId, cancellationToken);
            return document is null ? Results.NotFound() : Results.Ok(document);
        });
    }

    private static List<string> Split(string? value) =>
        [.. (value ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)];

    private static List<string> Scope(ComplianceStore store, string? tenantIds) =>
        Split(tenantIds) is { Count: > 0 } ids
            ? [.. store.Tenants.Where(tenant => ids.Contains(tenant.Id)).Select(tenant => tenant.Id)]
            : [.. store.Tenants.Select(tenant => tenant.Id)];

    /// <summary>Fordeling av svartyper, brukes i rapportene for fargekodede seksjoner.</summary>
    private static object AnswerCounts(IReadOnlyCollection<LckQuestion> questions) => new
    {
        yes = questions.Count(question => question.Answer == "Ja"),
        partial = questions.Count(question => question.Answer == "Delvis"),
        no = questions.Count(question => question.Answer == "Nei"),
        notRelevant = questions.Count(question => question.Answer == "Ikke relevant"),
        unanswered = questions.Count(question => question.Answer is null)
    };

    private static IEnumerable<LckQuestion> QuestionsIn(ComplianceStore store, IEnumerable<string> tenantIds, IEnumerable<LawRequirement> requirements) =>
        tenantIds.SelectMany(tenantId => requirements.SelectMany(requirement => store.QuestionsFor(tenantId, requirement.Id)));

    /// <summary>Spørsmål besvart av brukere i en gitt avdeling/enhet.</summary>
    private static IEnumerable<LckQuestion> UnitQuestions(ComplianceStore store, string tenantId, string unit)
    {
        var unitUserIds = store.Users.Where(user => user.TenantId == tenantId && user.Unit == unit).Select(user => user.Id).ToHashSet();
        return store.QuestionsFor(tenantId).Where(question => question.ResponderId is { } responder && unitUserIds.Contains(responder));
    }

    private static object UserView(ComplianceStore store, DemoUser user) => new
    {
        user.Id,
        user.TenantId,
        tenantName = store.FindTenant(user.TenantId)?.Name ?? user.TenantId,
        user.Name,
        user.Role,
        user.Unit,
        user.Email,
        user.AccessLevel,
        user.Permissions,
        user.Active,
        openDeviations = store.Deviations.Count(deviation => deviation.ResponsibleId == user.Id && deviation.Status != "Lukket"),
        answeredQuestions = store.QuestionsFor(user.TenantId).Count(question => question.ResponderId == user.Id && question.Answer is not null)
    };

    private static object TenantSummary(ComplianceStore store, Tenant tenant)
    {
        var questions = store.QuestionsFor(tenant.Id).ToList();
        return new
        {
            tenant.Id,
            tenant.Name,
            tenant.Industry,
            tenant.Description,
            tenant.Units,
            lawListCount = store.LawLists.Count,
            questionCount = questions.Count,
            answeredCount = questions.Count(question => question.Answer is not null),
            openDeviations = questions.Count(question => question.Answer is "Nei" or "Delvis" && question.ClosedDate is null),
            compliance = ComplianceStore.ScoreOf(questions)
        };
    }

    private static object LawListSummary(ComplianceStore store, LawList list)
    {
        var requirements = list.RequirementIds.Select(store.FindRequirement).OfType<LawRequirement>().ToList();
        return new
        {
            list.Id,
            list.Name,
            list.Description,
            list.RequirementIds,
            requirementCount = requirements.Count,
            compliance = ComplianceStore.ScoreOf(list.RequirementIds.SelectMany(id => store.QuestionsFor(requirementId: id))),
            areas = requirements.Select(item => item.Area).Distinct()
        };
    }

    /// <summary>Spec §11: lov/forskrift, paragraf, lovkrav, påvirkning, tiltak, LCK og status.</summary>
    private static IEnumerable<object> Rows(ComplianceStore store, LawList list, IReadOnlyList<string> tenantScope) =>
        list.RequirementIds
            .Select(store.FindRequirement).OfType<LawRequirement>()
            .Select(requirement =>
            {
                var content = store.GetContent(requirement.Id);
                var questions = tenantScope.SelectMany(tenantId => store.QuestionsFor(tenantId, requirement.Id)).ToList();
                return new
                {
                    requirement.Id,
                    requirement.Area,
                    requirement.LawName,
                    requirement.Paragraph,
                    requirement.RequirementText,
                    requirement.DokId,
                    requirement.RefId,
                    requirement.ChangeStatus,
                    content.Impact,
                    content.Measures,
                    content.Status,
                    content.Questions,
                    compliance = ComplianceStore.ScoreOf(questions),
                    openDeviations = questions.Count(question => question.Answer is "Nei" or "Delvis" && question.ClosedDate is null)
                };
            });

    private static object DeviationView(ComplianceStore store, Deviation deviation)
    {
        var requirement = store.FindRequirement(deviation.RequirementId);
        var question = store.FindLck(deviation.LckId)?.Items
            .FirstOrDefault(item => item.Id == deviation.ItemId)?.Questions
            .FirstOrDefault(item => item.Id == deviation.QuestionId);

        return new
        {
            deviation.Id,
            deviation.TenantId,
            tenantName = store.FindTenant(deviation.TenantId)?.Name ?? deviation.TenantId,
            deviation.LckId,
            lckName = store.FindLck(deviation.LckId)?.Name,
            deviation.RequirementId,
            law = requirement?.LawName,
            paragraph = requirement?.Paragraph,
            area = requirement?.Area,
            questionText = question?.Text,
            deviation.Answer,
            deviation.RespondentId,
            respondentName = store.Users.FirstOrDefault(user => user.Id == deviation.RespondentId)?.Name,
            deviation.Unit,
            deviation.Comment,
            deviation.Documentation,
            deviation.RegisteredDate,
            deviation.ResponsibleId,
            responsibleName = store.Users.FirstOrDefault(user => user.Id == deviation.ResponsibleId)?.Name,
            deviation.DueDate,
            deviation.Status,
            deviation.CreatedAutomatically,
            actions = store.ActionsForDeviation(deviation).Select(action => ActionView(store, action))
        };
    }

    private static object ActionView(ComplianceStore store, ActionItem action)
    {
        var requirement = action.RequirementId is null ? null : store.FindRequirement(action.RequirementId);
        return new
        {
            action.Id,
            action.TenantId,
            tenantName = store.FindTenant(action.TenantId)?.Name ?? action.TenantId,
            action.SourceType,
            action.SourceId,
            action.RequirementId,
            law = requirement?.LawName,
            paragraph = requirement?.Paragraph,
            action.Description,
            action.ResponsibleId,
            responsibleName = store.Users.FirstOrDefault(user => user.Id == action.ResponsibleId)?.Name,
            action.DueDate,
            action.Status,
            action.Documentation,
            action.Comment,
            action.CreatedAt
        };
    }

    private static object LegalChangeView(ComplianceStore store, LegalChange change, IReadOnlyList<string> scope)
    {
        var requirement = store.FindRequirement(change.RequirementId);
        return new
        {
            change.Id,
            change.RequirementId,
            law = requirement?.LawName,
            paragraph = requirement?.Paragraph,
            area = requirement?.Area,
            refId = requirement?.RefId,
            change.DetectedDate,
            change.EffectiveDate,
            change.PreviousText,
            change.NewText,
            change.Summary,
            change.BusinessImpact,
            change.Example,
            change.RecommendedAction,
            change.AiGenerated,
            lawLists = store.LawLists.Where(list => list.RequirementIds.Contains(change.RequirementId)).Select(list => list.Name),
            handlings = scope.Select(tenantId => new
            {
                tenantId,
                tenantName = store.FindTenant(tenantId)?.Name ?? tenantId,
                handling = store.GetHandling(change.Id, tenantId)
            })
        };
    }

    private static object LckSummary(ComplianceStore store, Lck lck, string? tenantId = null, HashSet<string>? requirementIds = null)
    {
        var items = lck.Items
            .Where(item => (tenantId is null || item.TenantId == tenantId) && (requirementIds is null || requirementIds.Contains(item.RequirementId)))
            .ToList();
        var questions = items.SelectMany(item => item.Questions).ToList();
        return new
        {
            lck.Id,
            lck.Name,
            lck.Status,
            lck.DueDate,
            isOverdue = ComplianceStore.IsOverdue(lck),
            lck.TenantIds,
            lck.AssigneeIds,
            tenantNames = lck.TenantIds.Select(id => store.FindTenant(id)?.Name ?? id),
            requirementCount = items.Select(item => item.RequirementId).Distinct().Count(),
            questionCount = questions.Count,
            answeredCount = questions.Count(question => question.Answer is not null),
            deviationCount = questions.Count(question => question.Answer is "Nei" or "Delvis" && question.ClosedDate is null),
            compliance = ComplianceStore.ScoreOf(questions)
        };
    }
}
