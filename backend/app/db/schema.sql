-- Axiom Database Schema (MySQL 8.0)

-- TABLES

CREATE TABLE users (
    id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(255) NOT NULL,
    role          ENUM('requester', 'annotator') NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id                       CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    requester_id             CHAR(36) NOT NULL,
    title                    VARCHAR(255) NOT NULL,
    description              TEXT,
    status                   ENUM('draft', 'active', 'paused', 'completed', 'archived') NOT NULL DEFAULT 'draft',
    min_annotations_per_item INT NOT NULL DEFAULT 3,
    deadline                 TIMESTAMP NULL,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE schema_fields (
    id          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id  CHAR(36) NOT NULL,
    field_key   VARCHAR(100) NOT NULL,
    label       VARCHAR(255) NOT NULL,
    description TEXT,
    field_type  ENUM('likert', 'boolean', 'free_text', 'bounding_box', 'image_tag', 'multi_select') NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    position    SMALLINT NOT NULL DEFAULT 0,
    config      JSON NOT NULL DEFAULT ('{}'),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_project_field (project_id, field_key),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE datasets (
    id         CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE dataset_items (
    id          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    dataset_id  CHAR(36) NOT NULL,
    external_id VARCHAR(255),
    item_data   JSON NOT NULL,
    position    INT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_dataset_external (dataset_id, external_id),
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

CREATE TABLE project_annotators (
    project_id   CHAR(36) NOT NULL,
    annotator_id CHAR(36) NOT NULL,
    enrolled_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, annotator_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (annotator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE annotation_tasks (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id      CHAR(36) NOT NULL,
    dataset_item_id CHAR(36) NOT NULL,
    annotator_id    CHAR(36) NOT NULL,
    status          ENUM('pending', 'in_progress', 'submitted', 'skipped') NOT NULL DEFAULT 'pending',
    assigned_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at      TIMESTAMP NULL,
    submitted_at    TIMESTAMP NULL,
    UNIQUE KEY uq_item_annotator (dataset_item_id, annotator_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (dataset_item_id) REFERENCES dataset_items(id) ON DELETE CASCADE,
    FOREIGN KEY (annotator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE annotations (
    id           CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    task_id      CHAR(36) NOT NULL UNIQUE,
    responses    JSON NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES annotation_tasks(id) ON DELETE CASCADE
);

CREATE TABLE ai_flags (
    id               CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id       CHAR(36) NOT NULL,
    dataset_item_id  CHAR(36) NOT NULL,
    is_flagged       BOOLEAN NOT NULL DEFAULT FALSE,
    confidence_score DECIMAL(5,4),
    rationale        TEXT,
    model_version    VARCHAR(100),
    flagged_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_project_item_flag (project_id, dataset_item_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (dataset_item_id) REFERENCES dataset_items(id) ON DELETE CASCADE
);

CREATE TABLE agreement_scores (
    id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id    CHAR(36) NOT NULL,
    field_key     VARCHAR(100) NOT NULL,
    alpha         DECIMAL(6,5),
    pct_agreement DECIMAL(5,4),
    n_items       INT,
    n_annotators  INT,
    computed_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_project_field_agree (project_id, field_key),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE export_log (
    id           CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id   CHAR(36) NOT NULL,
    requested_by CHAR(36) NOT NULL,
    format       VARCHAR(10) NOT NULL,
    row_count    INT,
    exported_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE
);

-- INDEXES

CREATE INDEX idx_tasks_annotator    ON annotation_tasks(annotator_id, status);
CREATE INDEX idx_tasks_project      ON annotation_tasks(project_id);
CREATE INDEX idx_tasks_item         ON annotation_tasks(dataset_item_id);
CREATE INDEX idx_flags_project      ON ai_flags(project_id, is_flagged);
CREATE INDEX idx_projects_requester ON projects(requester_id, status);

-- TRIGGERS

DELIMITER //

-- Trigger 1: Auto-mark task as submitted when annotation inserted
CREATE TRIGGER trg_annotation_after_insert
AFTER INSERT ON annotations
FOR EACH ROW
BEGIN
    UPDATE annotation_tasks
    SET status = 'submitted', submitted_at = NOW()
    WHERE id = NEW.task_id;
END//

-- Trigger 2: Auto-complete project when all tasks submitted
CREATE TRIGGER trg_annotation_check_completion
AFTER UPDATE ON annotation_tasks
FOR EACH ROW
BEGIN
    DECLARE total_tasks INT;
    DECLARE done_tasks INT;

    IF NEW.status = 'submitted' THEN
        SELECT COUNT(*) INTO total_tasks
        FROM annotation_tasks WHERE project_id = NEW.project_id;

        SELECT COUNT(*) INTO done_tasks
        FROM annotation_tasks
        WHERE project_id = NEW.project_id AND status = 'submitted';

        IF total_tasks > 0 AND total_tasks = done_tasks THEN
            UPDATE projects
            SET status = 'completed'
            WHERE id = NEW.project_id AND status = 'active';
        END IF;
    END IF;
END//

-- Trigger 3: Prevent schema field insert on non-draft projects
CREATE TRIGGER trg_schema_fields_before_insert
BEFORE INSERT ON schema_fields
FOR EACH ROW
BEGIN
    DECLARE proj_status VARCHAR(20);
    SELECT status INTO proj_status FROM projects WHERE id = NEW.project_id;
    IF proj_status != 'draft' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot add schema fields to a non-draft project';
    END IF;
END//

-- Trigger 4: Prevent schema field update on non-draft projects
CREATE TRIGGER trg_schema_fields_before_update
BEFORE UPDATE ON schema_fields
FOR EACH ROW
BEGIN
    DECLARE proj_status VARCHAR(20);
    SELECT status INTO proj_status FROM projects WHERE id = NEW.project_id;
    IF proj_status != 'draft' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot modify schema fields of a non-draft project';
    END IF;
END//

DELIMITER ;

-- VIEWS

CREATE OR REPLACE VIEW v_project_progress AS
SELECT
    p.id AS project_id,
    p.title,
    p.status,
    p.requester_id,
    p.deadline,
    COUNT(DISTINCT at2.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN at2.status = 'submitted' THEN at2.id END) AS submitted_tasks,
    COUNT(DISTINCT CASE WHEN at2.status = 'pending' THEN at2.id END) AS pending_tasks,
    COUNT(DISTINCT di.id) AS total_items,
    ROUND(
        COUNT(DISTINCT CASE WHEN at2.status = 'submitted' THEN at2.id END) * 100.0
        / NULLIF(COUNT(DISTINCT at2.id), 0), 1
    ) AS pct_complete,
    COUNT(DISTINCT CASE WHEN af.is_flagged = TRUE THEN af.dataset_item_id END) AS flagged_items
FROM projects p
LEFT JOIN annotation_tasks at2 ON at2.project_id = p.id
LEFT JOIN dataset_items di ON di.id = at2.dataset_item_id
LEFT JOIN ai_flags af ON af.project_id = p.id
GROUP BY p.id, p.title, p.status, p.requester_id, p.deadline;

CREATE OR REPLACE VIEW v_annotator_workload AS
SELECT
    u.id AS annotator_id,
    u.display_name,
    u.email,
    p.id AS project_id,
    p.title AS project_title,
    COUNT(at2.id) AS total_assigned,
    COUNT(CASE WHEN at2.status = 'submitted' THEN 1 END) AS completed,
    COUNT(CASE WHEN at2.status = 'pending' THEN 1 END) AS remaining,
    COUNT(CASE WHEN at2.status = 'in_progress' THEN 1 END) AS in_progress,
    ROUND(
        COUNT(CASE WHEN at2.status = 'submitted' THEN 1 END) * 100.0
        / NULLIF(COUNT(at2.id), 0), 1
    ) AS completion_pct,
    p.deadline
FROM users u
JOIN project_annotators pa ON pa.annotator_id = u.id
JOIN projects p ON p.id = pa.project_id
LEFT JOIN annotation_tasks at2 ON at2.annotator_id = u.id AND at2.project_id = p.id
WHERE u.role = 'annotator'
GROUP BY u.id, u.display_name, u.email, p.id, p.title, p.deadline;

CREATE OR REPLACE VIEW v_annotation_export AS
SELECT
    p.id AS project_id,
    p.title AS project_title,
    di.id AS item_id,
    di.external_id,
    di.item_data,
    u.id AS annotator_id,
    u.display_name AS annotator_name,
    a.responses,
    a.submitted_at,
    af.is_flagged AS ai_flagged,
    af.confidence_score AS ai_confidence,
    af.rationale AS ai_rationale
FROM annotations a
JOIN annotation_tasks at2 ON at2.id = a.task_id
JOIN projects p ON p.id = at2.project_id
JOIN dataset_items di ON di.id = at2.dataset_item_id
JOIN users u ON u.id = at2.annotator_id
LEFT JOIN ai_flags af ON af.project_id = p.id AND af.dataset_item_id = di.id;
