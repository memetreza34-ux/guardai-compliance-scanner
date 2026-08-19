const { HttpError } = require('../lib/httpError');

function mapSystemRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    systemName: row.name,
    organizationRole: row.organization_role,
    providerName: row.provider_name,
    modelName: row.model_name,
    deploymentContext: row.deployment_context,
    useCases: row.use_cases || [],
    declarations: {
      interactsDirectlyWithPeople: row.interacts_directly_with_people,
      generatesSyntheticContent: row.generates_synthetic_content,
      aiLiteracyMeasuresDocumented: row.ai_literacy_measures_documented,
      humanOversightControlsDocumented: row.human_oversight_controls_documented,
      interactionDisclosureDocumented: row.interaction_disclosure_documented,
      syntheticContentDisclosureDocumented: row.synthetic_content_disclosure_documented,
    },
    archivedAt: row.archived_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReviewRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    aiSystemId: row.ai_system_id,
    status: row.status,
    sourceRegistryId: row.source_registry_id,
    sourceRegistryVersion: row.source_registry_version,
    legalApplicabilityState: row.legal_applicability_state,
    systemSnapshot: row.system_snapshot,
    submittedBy: row.submitted_by,
    reviewedBy: row.reviewed_by,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReviewItemRow(row) {
  return {
    reviewId: row.review_id,
    itemKey: row.item_key,
    legalSourceId: row.legal_source_id,
    legalSource: row.legal_source_id
      ? {
          jurisdiction: row.jurisdiction,
          sourceName: row.source_name,
          reference: row.reference,
          sourceUrl: row.source_url,
        }
      : null,
    documentationState: row.documentation_state,
    applicabilityState: row.applicability_state,
    trigger: row.trigger_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function systemColumns() {
  return `id, organization_id, name, organization_role, provider_name, model_name,
          deployment_context, use_cases, interacts_directly_with_people,
          generates_synthetic_content, ai_literacy_measures_documented,
          human_oversight_controls_documented, interaction_disclosure_documented,
          synthetic_content_disclosure_documented, archived_at,
          created_by, created_at, updated_at`;
}

function reviewColumns() {
  return `id, organization_id, ai_system_id, status, source_registry_id,
          source_registry_version, legal_applicability_state, system_snapshot,
          submitted_by, reviewed_by, submitted_at, reviewed_at, created_at, updated_at`;
}

async function rollbackQuietly(client, label) {
  try {
    await client.query('rollback');
  } catch (error) {
    console.error(`[Database] ${label} rollback failed:`, error);
  }
}

function createAiGovernanceRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('AI Governance repository requires a PostgreSQL pool.');
  }

  async function createSystemProfile({ organizationId, createdBy, declaration }) {
    const d = declaration.declarations;
    const result = await pool.query(
      `insert into public.ai_system_profiles (
         organization_id, name, organization_role, provider_name, model_name,
         deployment_context, use_cases, interacts_directly_with_people,
         generates_synthetic_content, ai_literacy_measures_documented,
         human_oversight_controls_documented, interaction_disclosure_documented,
         synthetic_content_disclosure_documented, created_by
       ) values (
         $1, $2, $3, $4, $5, $6, $7::text[], $8, $9, $10, $11, $12, $13, $14
       )
       returning ${systemColumns()}`,
      [
        organizationId,
        declaration.systemName,
        declaration.organizationRole,
        declaration.providerName,
        declaration.modelName,
        declaration.deploymentContext,
        declaration.useCases,
        d.interactsDirectlyWithPeople,
        d.generatesSyntheticContent,
        d.aiLiteracyMeasuresDocumented,
        d.humanOversightControlsDocumented,
        d.interactionDisclosureDocumented,
        d.syntheticContentDisclosureDocumented,
        createdBy,
      ],
    );
    return mapSystemRow(result.rows[0]);
  }

  async function updateSystemProfile({ organizationId, systemId, declaration }) {
    const d = declaration.declarations;
    const result = await pool.query(
      `update public.ai_system_profiles
          set name = $3,
              organization_role = $4,
              provider_name = $5,
              model_name = $6,
              deployment_context = $7,
              use_cases = $8::text[],
              interacts_directly_with_people = $9,
              generates_synthetic_content = $10,
              ai_literacy_measures_documented = $11,
              human_oversight_controls_documented = $12,
              interaction_disclosure_documented = $13,
              synthetic_content_disclosure_documented = $14,
              updated_at = now()
        where organization_id = $1
          and id = $2
          and archived_at is null
        returning ${systemColumns()}`,
      [
        organizationId,
        systemId,
        declaration.systemName,
        declaration.organizationRole,
        declaration.providerName,
        declaration.modelName,
        declaration.deploymentContext,
        declaration.useCases,
        d.interactsDirectlyWithPeople,
        d.generatesSyntheticContent,
        d.aiLiteracyMeasuresDocumented,
        d.humanOversightControlsDocumented,
        d.interactionDisclosureDocumented,
        d.syntheticContentDisclosureDocumented,
      ],
    );
    return result.rowCount > 0 ? mapSystemRow(result.rows[0]) : null;
  }

  async function archiveSystemProfile({ organizationId, systemId }) {
    const result = await pool.query(
      `update public.ai_system_profiles
          set archived_at = coalesce(archived_at, now()),
              updated_at = now()
        where organization_id = $1 and id = $2
        returning ${systemColumns()}`,
      [organizationId, systemId],
    );
    return result.rowCount > 0 ? mapSystemRow(result.rows[0]) : null;
  }

  async function listSystemProfiles(organizationId, { includeArchived = false } = {}) {
    const result = await pool.query(
      `select ${systemColumns()}
         from public.ai_system_profiles
        where organization_id = $1
          and ($2::boolean = true or archived_at is null)
        order by created_at desc`,
      [organizationId, includeArchived],
    );
    return result.rows.map(mapSystemRow);
  }

  async function getSystemProfile(organizationId, systemId) {
    const result = await pool.query(
      `select ${systemColumns()}
         from public.ai_system_profiles
        where organization_id = $1 and id = $2
        limit 1`,
      [organizationId, systemId],
    );
    return result.rowCount > 0 ? mapSystemRow(result.rows[0]) : null;
  }

  async function createReviewWithItems({
    organizationId,
    aiSystemId,
    sourceRegistryId,
    sourceRegistryVersion,
    reviewItems,
  }) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const profile = await client.query(
        `select id
           from public.ai_system_profiles
          where organization_id = $1
            and id = $2
            and archived_at is null
          for share`,
        [organizationId, aiSystemId],
      );
      if (profile.rowCount === 0) {
        throw new HttpError(404, 'AI System profile was not found or is archived.', 'AI_SYSTEM_NOT_FOUND');
      }

      const reviewResult = await client.query(
        `insert into public.ai_governance_reviews (
           organization_id, ai_system_id, status,
           source_registry_id, source_registry_version,
           legal_applicability_state
         ) values ($1, $2, 'draft', $3, $4, 'requires_human_review')
         returning ${reviewColumns()}`,
        [organizationId, aiSystemId, sourceRegistryId, sourceRegistryVersion],
      );
      const review = reviewResult.rows[0];

      for (const item of reviewItems) {
        await client.query(
          `insert into public.ai_governance_review_items (
             organization_id, review_id, item_key, legal_source_id,
             documentation_state, applicability_state, trigger_key
           ) values ($1, $2, $3, $4, $5, 'requires_human_review', $6)`,
          [
            organizationId,
            review.id,
            item.itemKey,
            item.legalSourceId,
            item.documentationState,
            item.trigger,
          ],
        );
      }

      await client.query('commit');
      return getReview(organizationId, review.id);
    } catch (error) {
      await rollbackQuietly(client, 'AI Governance review creation');
      throw error;
    } finally {
      client.release();
    }
  }

  async function getReview(organizationId, reviewId) {
    const reviewResult = await pool.query(
      `select ${reviewColumns()}
         from public.ai_governance_reviews
        where organization_id = $1 and id = $2
        limit 1`,
      [organizationId, reviewId],
    );
    if (reviewResult.rowCount === 0) return null;

    const itemsResult = await pool.query(
      `select i.review_id, i.item_key, i.legal_source_id,
              i.documentation_state, i.applicability_state, i.trigger_key,
              i.created_at, i.updated_at,
              l.jurisdiction, l.source_name, l.reference, l.source_url
         from public.ai_governance_review_items i
         join public.legal_sources l on l.id = i.legal_source_id
        where i.organization_id = $1 and i.review_id = $2
        order by i.item_key asc`,
      [organizationId, reviewId],
    );

    return {
      ...mapReviewRow(reviewResult.rows[0]),
      items: itemsResult.rows.map(mapReviewItemRow),
    };
  }

  async function listReviews(organizationId, aiSystemId = null) {
    const result = await pool.query(
      `select ${reviewColumns()}
         from public.ai_governance_reviews
        where organization_id = $1
          and ($2::uuid is null or ai_system_id = $2)
        order by created_at desc`,
      [organizationId, aiSystemId],
    );
    return result.rows.map(mapReviewRow);
  }

  async function transitionReview({ organizationId, reviewId, action, actorId }) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const currentResult = await client.query(
        `select ${reviewColumns()}
           from public.ai_governance_reviews
          where organization_id = $1 and id = $2
          for update`,
        [organizationId, reviewId],
      );
      if (currentResult.rowCount === 0) {
        throw new HttpError(404, 'AI Governance review was not found.', 'AI_GOVERNANCE_REVIEW_NOT_FOUND');
      }
      const current = currentResult.rows[0];

      let update;
      if (action === 'submit' && ['draft', 'reopened'].includes(current.status)) {
        update = {
          status: 'submitted',
          submittedBy: actorId,
          reviewedBy: null,
        };
      } else if (action === 'review' && current.status === 'submitted') {
        update = {
          status: 'reviewed',
          submittedBy: current.submitted_by,
          reviewedBy: actorId,
        };
      } else if (action === 'reopen' && current.status === 'reviewed') {
        update = {
          status: 'reopened',
          submittedBy: current.submitted_by,
          reviewedBy: null,
        };
      } else {
        throw new HttpError(
          409,
          'AI Governance review status transition is not allowed.',
          'AI_GOVERNANCE_REVIEW_TRANSITION_INVALID',
          { status: current.status, action },
        );
      }

      const changed = await client.query(
        `update public.ai_governance_reviews
            set status = $3,
                submitted_by = $4,
                reviewed_by = $5,
                submitted_at = case
                  when $3 = 'submitted' then coalesce(submitted_at, now())
                  else submitted_at
                end,
                reviewed_at = case
                  when $3 = 'reviewed' then now()
                  when $3 = 'reopened' then null
                  else reviewed_at
                end,
                updated_at = now()
          where organization_id = $1 and id = $2
          returning ${reviewColumns()}`,
        [organizationId, reviewId, update.status, update.submittedBy, update.reviewedBy],
      );

      await client.query('commit');
      return mapReviewRow(changed.rows[0]);
    } catch (error) {
      await rollbackQuietly(client, 'AI Governance review transition');
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    archiveSystemProfile,
    createReviewWithItems,
    createSystemProfile,
    getReview,
    getSystemProfile,
    listReviews,
    listSystemProfiles,
    transitionReview,
    updateSystemProfile,
  };
}

module.exports = {
  createAiGovernanceRepository,
  mapReviewItemRow,
  mapReviewRow,
  mapSystemRow,
};
