-- Axiom Stored Procedures (MySQL 8.0)

DELIMITER //

-- SP 1: sp_assign_tasks
-- Distributes dataset items to enrolled annotators round-robin.
-- Each item gets min_annotations_per_item distinct annotators.

CREATE PROCEDURE sp_assign_tasks(IN p_project_id CHAR(36))
BEGIN
    DECLARE v_min_ann INT;
    DECLARE v_item_id CHAR(36);
    DECLARE v_annotator_id CHAR(36);
    DECLARE v_existing_count INT;
    DECLARE v_assigned INT;
    DECLARE v_ann_count INT;
    DECLARE v_ann_idx INT;
    DECLARE done_items INT DEFAULT FALSE;
    DECLARE done_anns INT DEFAULT FALSE;

    -- Cursor for all items in this project
    DECLARE item_cursor CURSOR FOR
        SELECT di.id
        FROM dataset_items di
        JOIN datasets d ON d.id = di.dataset_id
        WHERE d.project_id = p_project_id
        ORDER BY di.position, di.created_at;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_items = TRUE;

    -- Get min annotations per item
    SELECT min_annotations_per_item INTO v_min_ann
    FROM projects WHERE id = p_project_id;

    IF v_min_ann IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Project not found';
    END IF;

    -- Get annotator count
    SELECT COUNT(*) INTO v_ann_count
    FROM project_annotators WHERE project_id = p_project_id;

    IF v_ann_count = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No annotators enrolled in project';
    END IF;

    -- Create temp table of annotators for round-robin
    DROP TEMPORARY TABLE IF EXISTS tmp_annotators;
    CREATE TEMPORARY TABLE tmp_annotators (
        idx INT AUTO_INCREMENT PRIMARY KEY,
        annotator_id CHAR(36)
    );
    INSERT INTO tmp_annotators (annotator_id)
    SELECT annotator_id FROM project_annotators
    WHERE project_id = p_project_id
    ORDER BY RAND();

    SET v_ann_idx = 1;

    OPEN item_cursor;

    item_loop: LOOP
        FETCH item_cursor INTO v_item_id;
        IF done_items THEN
            LEAVE item_loop;
        END IF;

        -- How many tasks already exist for this item?
        SELECT COUNT(*) INTO v_existing_count
        FROM annotation_tasks
        WHERE dataset_item_id = v_item_id AND project_id = p_project_id;

        SET v_assigned = v_existing_count;

        -- Assign remaining slots
        assign_loop: WHILE v_assigned < v_min_ann DO
            -- Get annotator at current index
            SELECT annotator_id INTO v_annotator_id
            FROM tmp_annotators WHERE idx = v_ann_idx;

            -- Check if this annotator is already assigned to this item
            IF NOT EXISTS (
                SELECT 1 FROM annotation_tasks
                WHERE dataset_item_id = v_item_id
                AND annotator_id = v_annotator_id
                AND project_id = p_project_id
            ) THEN
                INSERT INTO annotation_tasks (project_id, dataset_item_id, annotator_id)
                VALUES (p_project_id, v_item_id, v_annotator_id);
                SET v_assigned = v_assigned + 1;
            END IF;

            -- Move to next annotator (round-robin)
            SET v_ann_idx = (v_ann_idx % v_ann_count) + 1;

            -- Safety: if we've cycled through all annotators, break
            IF v_assigned = v_existing_count AND v_ann_idx = 1 THEN
                LEAVE assign_loop;
            END IF;
        END WHILE;
    END LOOP;

    CLOSE item_cursor;
    DROP TEMPORARY TABLE IF EXISTS tmp_annotators;
END//

-- SP 2: sp_compute_agreement
-- Calculates % agreement per Likert/boolean field.
-- For each field, checks how many items have unanimous scores.

CREATE PROCEDURE sp_compute_agreement(IN p_project_id CHAR(36))
BEGIN
    DECLARE v_field_key VARCHAR(100);
    DECLARE v_field_type VARCHAR(20);
    DECLARE v_n_items INT;
    DECLARE v_n_agree INT;
    DECLARE v_n_annotators INT;
    DECLARE v_pct DECIMAL(5,4);
    DECLARE done INT DEFAULT FALSE;

    DECLARE field_cursor CURSOR FOR
        SELECT field_key, field_type FROM schema_fields
        WHERE project_id = p_project_id
        AND field_type IN ('likert', 'boolean');

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Get annotator count
    SELECT COUNT(DISTINCT annotator_id) INTO v_n_annotators
    FROM project_annotators WHERE project_id = p_project_id;

    OPEN field_cursor;

    field_loop: LOOP
        FETCH field_cursor INTO v_field_key, v_field_type;
        IF done THEN
            LEAVE field_loop;
        END IF;

        -- Count items with at least 2 submitted annotations for this field
        SELECT COUNT(*) INTO v_n_items
        FROM (
            SELECT at2.dataset_item_id
            FROM annotation_tasks at2
            JOIN annotations a ON a.task_id = at2.id
            WHERE at2.project_id = p_project_id
            AND at2.status = 'submitted'
            AND JSON_EXTRACT(a.responses, CONCAT('$.', v_field_key)) IS NOT NULL
            GROUP BY at2.dataset_item_id
            HAVING COUNT(*) >= 2
        ) sub;

        -- Count items where all annotators gave the same value
        SELECT COUNT(*) INTO v_n_agree
        FROM (
            SELECT at2.dataset_item_id
            FROM annotation_tasks at2
            JOIN annotations a ON a.task_id = at2.id
            WHERE at2.project_id = p_project_id
            AND at2.status = 'submitted'
            AND JSON_EXTRACT(a.responses, CONCAT('$.', v_field_key)) IS NOT NULL
            GROUP BY at2.dataset_item_id
            HAVING COUNT(*) >= 2
            AND COUNT(DISTINCT JSON_EXTRACT(a.responses, CONCAT('$.', v_field_key))) = 1
        ) sub;

        -- Compute percentage
        IF v_n_items > 0 THEN
            SET v_pct = v_n_agree / v_n_items;
        ELSE
            SET v_pct = NULL;
        END IF;

        -- Upsert into agreement_scores
        INSERT INTO agreement_scores (project_id, field_key, pct_agreement, n_items, n_annotators, computed_at)
        VALUES (p_project_id, v_field_key, v_pct, v_n_items, v_n_annotators, NOW())
        ON DUPLICATE KEY UPDATE
            pct_agreement = VALUES(pct_agreement),
            n_items = VALUES(n_items),
            n_annotators = VALUES(n_annotators),
            computed_at = NOW();
    END LOOP;

    CLOSE field_cursor;
END//

DELIMITER ;
