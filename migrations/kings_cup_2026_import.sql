-- =============================================================================
-- Kings Cup 2026 — Полный импорт данных турнира
-- GoalityTMC (goality.app) | org_id=1, tournament_id=1
-- =============================================================================

BEGIN;

-- Очищаем старые данные для Kings Cup 2026 (tournament_id=1)
DELETE FROM match_result_log    WHERE match_id IN (SELECT id FROM matches WHERE tournament_id=1);
DELETE FROM match_events         WHERE match_id IN (SELECT id FROM matches WHERE tournament_id=1);
DELETE FROM matches              WHERE tournament_id=1;
DELETE FROM standings            WHERE tournament_id=1;
DELETE FROM group_teams          WHERE group_id IN (SELECT id FROM stage_groups WHERE tournament_id=1);
DELETE FROM stage_slots          WHERE stage_id IN (SELECT id FROM tournament_stages WHERE tournament_id=1);
DELETE FROM match_rounds         WHERE stage_id IN (SELECT id FROM tournament_stages WHERE tournament_id=1);
DELETE FROM stage_groups         WHERE tournament_id=1;
DELETE FROM qualification_rules
  WHERE from_stage_id  IN (SELECT id FROM tournament_stages WHERE tournament_id=1)
     OR target_stage_id IN (SELECT id FROM tournament_stages WHERE tournament_id=1);
DELETE FROM tournament_stages    WHERE tournament_id=1;
DELETE FROM people               WHERE team_id IN (SELECT id FROM teams WHERE tournament_id=1);
DELETE FROM teams                WHERE tournament_id=1;
DELETE FROM clubs                WHERE tournament_id=1;
DELETE FROM tournament_classes   WHERE tournament_id=1;
DELETE FROM tournament_fields    WHERE tournament_id=1;

-- =============================================================================
-- ПОЛЯ (АРЕНЫ)
-- =============================================================================
INSERT INTO tournament_fields (tournament_id, name, address, sort_order) VALUES
  (1, 'Sportland Arena',  'A. Le Coq Arena, Jalgpalli tänav, Tallinn', 1),
  (1, 'Nike Arena',       'A. Le Coq Arena, Jalgpalli tänav, Tallinn', 2),
  (1, 'EJL-Hall',         'A. Le Coq Arena, Jalgpalli tänav, Tallinn', 3);

-- =============================================================================
-- ДИВИЗИОНЫ
-- =============================================================================
INSERT INTO tournament_classes (tournament_id, name, format, min_birth_year, max_players) VALUES
  (1, 'B2014', '5x5', 2014, 12),
  (1, 'B2015', '5x5', 2015, 12),
  (1, 'B2016', '5x5', 2016, 12);

-- =============================================================================
-- КЛУБЫ (25 логотипов в /uploads/kc/)
-- =============================================================================
INSERT INTO clubs (tournament_id, name, country, city, badge_url) VALUES
  (1, 'FC Flora Tallinn',    'Estonia',     'Tallinn',   '/uploads/kc/flora.png'),
  (1, 'FCI Levadia Tallinn', 'Estonia',     'Tallinn',   '/uploads/kc/8BAB70E84343E8221FAF2207DCA4E7C7-2-2.png'),
  (1, 'FC Kalev Tallinn',    'Estonia',     'Tallinn',   '/uploads/kc/logo_kalev.png'),
  (1, 'FC Infonet Tallinn',  'Estonia',     'Tallinn',   '/uploads/kc/i.png'),
  (1, 'Pärnu JK',            'Estonia',     'Pärnu',     '/uploads/kc/entry-file-0.90359000-170802884465ce73acdc9a7-5BCFCA3C-B0DA-4F55-A8A4-5AEE2275E7FD-1.png'),
  (1, 'Tallinn FC United',   'Estonia',     'Tallinn',   '/uploads/kc/5E6B4A8FA3C06BFDDBBB7D0DA7C4CA3B-2.png'),
  (1, 'FC Ilves',            'Finland',     'Tampere',   '/uploads/kc/Ilves-logo-favicon_631px.png'),
  (1, 'PK-35 Vantaa',        'Finland',     'Vantaa',    '/uploads/kc/PK-35_and_PK-35_Vantaa_logo_2020.png'),
  (1, 'HODY',                'Finland',     null,        '/uploads/kc/HODY-logo1.png'),
  (1, 'FK Metta/LU',         'Latvia',      'Riga',      '/uploads/kc/FK_METTA.png'),
  (1, 'FK Liepāja',          'Latvia',      'Liepāja',   '/uploads/kc/Lipea.png'),
  (1, 'FA Ateitis',          'Lithuania',   'Vilnius',   '/uploads/kc/FA-Ateitis.png'),
  (1, 'AIK',                 'Sweden',      'Stockholm', '/uploads/kc/AIK_logo.svg.png'),
  (1, 'JFS',                 'Sweden',      null,        '/uploads/kc/JFS_Logo_4c_transparent-300x248-1.png'),
  (1, 'TFF Spain',           'Spain',       null,        '/uploads/kc/TFF-SPAIN-2.png'),
  (1, 'AZ Alkmaar',          'Netherlands', 'Alkmaar',   '/uploads/kc/AZ_Alkmaar.svg.png'),
  (1, 'Club 17',             null,          null,        '/uploads/kc/Layer-1.png'),
  (1, 'Club 18',             null,          null,        '/uploads/kc/Layer-2.png'),
  (1, 'Club 19',             null,          null,        '/uploads/kc/me.png'),
  (1, 'Club 20',             null,          null,        '/uploads/kc/C287B9A18B8C02FDA9A7E921E6D3E645.png'),
  (1, 'Club 21',             null,          null,        '/uploads/kc/entry-file-d8de34110d38f6b5164a0fb49bf9e0c1.png'),
  (1, 'Club 22',             null,          null,        '/uploads/kc/entry-file-e7cc5d414a257f08a1c487bcbd5bf9a3.png'),
  (1, 'Club 23',             null,          null,        '/uploads/kc/entry-file-e0f2691d52d860cab3e1c8b84cd9b934.png'),
  (1, 'Club 24',             null,          null,        '/uploads/kc/logo_page_retro.png');

-- =============================================================================
-- ОСНОВНАЯ ЛОГИКА ИМПОРТА
-- =============================================================================
DO $$
DECLARE
  t_id  int := 1;
  org   int := 1;

  cls_2014 int; cls_2015 int; cls_2016 int;

  c_flora int; c_levadia int; c_kalev int; c_infonet int; c_parnu int; c_united int;
  c_ilves int; c_pk35 int; c_hody int; c_metta int; c_liepaja int; c_ateitis int;
  c_aik int; c_jfs int; c_tff int; c_az int;
  c_17 int; c_18 int; c_19 int; c_20 int; c_21 int; c_22 int; c_23 int; c_24 int;

  stage_lp   int; stage_cl int; stage_el int; stage_conf int;
  stage_g15  int; stage_ko15 int;
  stage_g16  int; stage_ko16 int;

  grp_lp     int; grp_conf int; grp_15a int; grp_15b int; grp_16 int;

  r_cl_qf int; r_cl_sf int; r_cl_f int;
  r_el_qf int; r_el_sf int; r_el_f int;
  r_15sf int; r_15f int;
  r_16sf int; r_16f int;

BEGIN
  -- Классы
  SELECT id INTO cls_2014 FROM tournament_classes WHERE tournament_id=1 AND name='B2014';
  SELECT id INTO cls_2015 FROM tournament_classes WHERE tournament_id=1 AND name='B2015';
  SELECT id INTO cls_2016 FROM tournament_classes WHERE tournament_id=1 AND name='B2016';

  -- Клубы
  SELECT id INTO c_flora   FROM clubs WHERE tournament_id=1 AND name='FC Flora Tallinn';
  SELECT id INTO c_levadia FROM clubs WHERE tournament_id=1 AND name='FCI Levadia Tallinn';
  SELECT id INTO c_kalev   FROM clubs WHERE tournament_id=1 AND name='FC Kalev Tallinn';
  SELECT id INTO c_infonet FROM clubs WHERE tournament_id=1 AND name='FC Infonet Tallinn';
  SELECT id INTO c_parnu   FROM clubs WHERE tournament_id=1 AND name='Pärnu JK';
  SELECT id INTO c_united  FROM clubs WHERE tournament_id=1 AND name='Tallinn FC United';
  SELECT id INTO c_ilves   FROM clubs WHERE tournament_id=1 AND name='FC Ilves';
  SELECT id INTO c_pk35    FROM clubs WHERE tournament_id=1 AND name='PK-35 Vantaa';
  SELECT id INTO c_hody    FROM clubs WHERE tournament_id=1 AND name='HODY';
  SELECT id INTO c_metta   FROM clubs WHERE tournament_id=1 AND name='FK Metta/LU';
  SELECT id INTO c_liepaja FROM clubs WHERE tournament_id=1 AND name='FK Liepāja';
  SELECT id INTO c_ateitis FROM clubs WHERE tournament_id=1 AND name='FA Ateitis';
  SELECT id INTO c_aik     FROM clubs WHERE tournament_id=1 AND name='AIK';
  SELECT id INTO c_jfs     FROM clubs WHERE tournament_id=1 AND name='JFS';
  SELECT id INTO c_tff     FROM clubs WHERE tournament_id=1 AND name='TFF Spain';
  SELECT id INTO c_az      FROM clubs WHERE tournament_id=1 AND name='AZ Alkmaar';
  SELECT id INTO c_17      FROM clubs WHERE tournament_id=1 AND name='Club 17';
  SELECT id INTO c_18      FROM clubs WHERE tournament_id=1 AND name='Club 18';
  SELECT id INTO c_19      FROM clubs WHERE tournament_id=1 AND name='Club 19';
  SELECT id INTO c_20      FROM clubs WHERE tournament_id=1 AND name='Club 20';
  SELECT id INTO c_21      FROM clubs WHERE tournament_id=1 AND name='Club 21';
  SELECT id INTO c_22      FROM clubs WHERE tournament_id=1 AND name='Club 22';
  SELECT id INTO c_23      FROM clubs WHERE tournament_id=1 AND name='Club 23';
  SELECT id INTO c_24      FROM clubs WHERE tournament_id=1 AND name='Club 24';

  -- ══════════════════════════════════════════════════════
  -- КОМАНДЫ B2014 (22 команды, reg_number 1-22)
  -- ══════════════════════════════════════════════════════
  INSERT INTO teams (tournament_id, class_id, club_id, name, status, reg_number) VALUES
    (t_id, cls_2014, c_flora,   'FC Flora B2014',      'confirmed',  1),
    (t_id, cls_2014, c_levadia, 'FCI Levadia B2014',   'confirmed',  2),
    (t_id, cls_2014, c_kalev,   'FC Kalev B2014',      'confirmed',  3),
    (t_id, cls_2014, c_infonet, 'FC Infonet B2014',    'confirmed',  4),
    (t_id, cls_2014, c_parnu,   'Pärnu JK B2014',      'confirmed',  5),
    (t_id, cls_2014, c_united,  'TFC United B2014',    'confirmed',  6),
    (t_id, cls_2014, c_ilves,   'FC Ilves B2014',      'confirmed',  7),
    (t_id, cls_2014, c_pk35,    'PK-35 Vantaa B2014',  'confirmed',  8),
    (t_id, cls_2014, c_hody,    'HODY B2014',          'confirmed',  9),
    (t_id, cls_2014, c_metta,   'FK Metta B2014',      'confirmed', 10),
    (t_id, cls_2014, c_liepaja, 'FK Liepāja B2014',    'confirmed', 11),
    (t_id, cls_2014, c_ateitis, 'FA Ateitis B2014',    'confirmed', 12),
    (t_id, cls_2014, c_aik,     'AIK B2014',           'confirmed', 13),
    (t_id, cls_2014, c_jfs,     'JFS B2014',           'confirmed', 14),
    (t_id, cls_2014, c_tff,     'TFF Spain B2014',     'confirmed', 15),
    (t_id, cls_2014, c_az,      'AZ Alkmaar B2014',    'confirmed', 16),
    (t_id, cls_2014, c_17,      'Team 17 B2014',       'confirmed', 17),
    (t_id, cls_2014, c_18,      'Team 18 B2014',       'confirmed', 18),
    (t_id, cls_2014, c_19,      'Team 19 B2014',       'confirmed', 19),
    (t_id, cls_2014, c_20,      'Team 20 B2014',       'confirmed', 20),
    (t_id, cls_2014, c_21,      'Team 21 B2014',       'confirmed', 21),
    (t_id, cls_2014, c_22,      'Team 22 B2014',       'confirmed', 22);

  -- ══════════════════════════════════════════════════════
  -- КОМАНДЫ B2015 (14 команд, reg_number 23-36)
  -- ══════════════════════════════════════════════════════
  INSERT INTO teams (tournament_id, class_id, club_id, name, status, reg_number) VALUES
    (t_id, cls_2015, c_flora,   'FC Flora B2015',      'confirmed', 23),
    (t_id, cls_2015, c_levadia, 'FCI Levadia B2015',   'confirmed', 24),
    (t_id, cls_2015, c_kalev,   'FC Kalev B2015',      'confirmed', 25),
    (t_id, cls_2015, c_infonet, 'FC Infonet B2015',    'confirmed', 26),
    (t_id, cls_2015, c_ilves,   'FC Ilves B2015',      'confirmed', 27),
    (t_id, cls_2015, c_pk35,    'PK-35 Vantaa B2015',  'confirmed', 28),
    (t_id, cls_2015, c_metta,   'FK Metta B2015',      'confirmed', 29),
    (t_id, cls_2015, c_aik,     'AIK B2015',           'confirmed', 30),
    (t_id, cls_2015, c_tff,     'TFF Spain B2015',     'confirmed', 31),
    (t_id, cls_2015, c_az,      'AZ Alkmaar B2015',    'confirmed', 32),
    (t_id, cls_2015, c_ateitis, 'FA Ateitis B2015',    'confirmed', 33),
    (t_id, cls_2015, c_hody,    'HODY B2015',          'confirmed', 34),
    (t_id, cls_2015, c_23,      'Team 13 B2015',       'confirmed', 35),
    (t_id, cls_2015, c_24,      'Team 14 B2015',       'confirmed', 36);

  -- ══════════════════════════════════════════════════════
  -- КОМАНДЫ B2016 (8 команд, reg_number 37-44)
  -- ══════════════════════════════════════════════════════
  INSERT INTO teams (tournament_id, class_id, club_id, name, status, reg_number) VALUES
    (t_id, cls_2016, c_flora,   'FC Flora B2016',      'confirmed', 37),
    (t_id, cls_2016, c_levadia, 'FCI Levadia B2016',   'confirmed', 38),
    (t_id, cls_2016, c_kalev,   'FC Kalev B2016',      'confirmed', 39),
    (t_id, cls_2016, c_infonet, 'FC Infonet B2016',    'confirmed', 40),
    (t_id, cls_2016, c_ilves,   'FC Ilves B2016',      'confirmed', 41),
    (t_id, cls_2016, c_pk35,    'PK-35 Vantaa B2016',  'confirmed', 42),
    (t_id, cls_2016, c_metta,   'FK Metta B2016',      'confirmed', 43),
    (t_id, cls_2016, c_aik,     'AIK B2016',           'confirmed', 44);

  -- ══════════════════════════════════════════════════════
  -- B2014 ЭТАПЫ
  -- ══════════════════════════════════════════════════════

  -- League Phase
  INSERT INTO tournament_stages (tournament_id, organization_id, name, name_ru, name_et, type, "order", status, class_id, settings)
  VALUES (t_id, org, 'League Phase', 'Лига-фаза', 'Liiga-faas', 'league', 1, 'active', cls_2014,
    '{"pointsWin":3,"pointsDraw":1,"pointsLoss":0,"matchDurationMinutes":20}')
  RETURNING id INTO stage_lp;

  -- Champions Playoff
  INSERT INTO tournament_stages (tournament_id, organization_id, name, name_ru, name_et, type, "order", status, class_id, settings)
  VALUES (t_id, org, 'Champions Playoff', 'Лига Чемпионов', 'Meistrite Liiga', 'knockout', 2, 'pending', cls_2014,
    '{"matchDurationMinutes":20}')
  RETURNING id INTO stage_cl;

  -- Europa Playoff
  INSERT INTO tournament_stages (tournament_id, organization_id, name, name_ru, name_et, type, "order", status, class_id, settings)
  VALUES (t_id, org, 'Europa Playoff', 'Лига Европы', 'Euroopa Liiga', 'knockout', 3, 'pending', cls_2014,
    '{"matchDurationMinutes":20}')
  RETURNING id INTO stage_el;

  -- Conference Group
  INSERT INTO tournament_stages (tournament_id, organization_id, name, name_ru, name_et, type, "order", status, class_id, settings)
  VALUES (t_id, org, 'Conference Group', 'Лига Конференций', 'Konverentsi Liiga', 'group', 4, 'pending', cls_2014,
    '{"pointsWin":3,"pointsDraw":1,"pointsLoss":0,"matchDurationMinutes":20}')
  RETURNING id INTO stage_conf;

  -- Группа League Phase (22 команды)
  INSERT INTO stage_groups (stage_id, tournament_id, name, "order") VALUES (stage_lp, t_id, 'L', 1) RETURNING id INTO grp_lp;
  INSERT INTO group_teams (group_id, team_id) SELECT grp_lp, id FROM teams WHERE tournament_id=t_id AND class_id=cls_2014;

  -- Группа Conference (заполняется после advance)
  INSERT INTO stage_groups (stage_id, tournament_id, name, "order") VALUES (stage_conf, t_id, 'C', 1) RETURNING id INTO grp_conf;

  -- Раунды Champions
  INSERT INTO match_rounds (stage_id, name, name_ru, name_et, short_name, "order", match_count, is_two_legged, has_third_place) VALUES
    (stage_cl, 'Quarter-final', 'Четвертьфинал', 'Veerandfinaal', 'QF', 3, 4, false, false),
    (stage_cl, 'Semi-final',    'Полуфинал',     'Poolfinaal',    'SF', 2, 2, false, false),
    (stage_cl, 'Final',         'Финал',         'Finaal',        'F',  1, 1, false, true);

  SELECT id INTO r_cl_qf FROM match_rounds WHERE stage_id=stage_cl AND short_name='QF';
  SELECT id INTO r_cl_sf FROM match_rounds WHERE stage_id=stage_cl AND short_name='SF';
  SELECT id INTO r_cl_f  FROM match_rounds WHERE stage_id=stage_cl AND short_name='F';

  -- Раунды Europa
  INSERT INTO match_rounds (stage_id, name, name_ru, name_et, short_name, "order", match_count, is_two_legged, has_third_place) VALUES
    (stage_el, 'Quarter-final', 'Четвертьфинал', 'Veerandfinaal', 'QF', 3, 4, false, false),
    (stage_el, 'Semi-final',    'Полуфинал',     'Poolfinaal',    'SF', 2, 2, false, false),
    (stage_el, 'Final',         'Финал',         'Finaal',        'F',  1, 1, false, true);

  SELECT id INTO r_el_qf FROM match_rounds WHERE stage_id=stage_el AND short_name='QF';
  SELECT id INTO r_el_sf FROM match_rounds WHERE stage_id=stage_el AND short_name='SF';
  SELECT id INTO r_el_f  FROM match_rounds WHERE stage_id=stage_el AND short_name='F';

  -- Пустые матчи CL (QF: 4, SF: 2, F: 1 + 3rd: 1)
  INSERT INTO matches (tournament_id, organization_id, stage_id, round_id, match_number, status, is_public)
  SELECT t_id, org, stage_cl, r_cl_qf, n, 'scheduled', true FROM generate_series(1,4) n;
  INSERT INTO matches (tournament_id, organization_id, stage_id, round_id, match_number, status, is_public)
  SELECT t_id, org, stage_cl, r_cl_sf, n, 'scheduled', true FROM generate_series(5,6) n;
  INSERT INTO matches (tournament_id, organization_id, stage_id, round_id, match_number, status, is_public) VALUES
    (t_id, org, stage_cl, r_cl_f, 7, 'scheduled', true),
    (t_id, org, stage_cl, r_cl_f, 8, 'scheduled', true); -- 3-е место

  -- Пустые матчи EL
  INSERT INTO matches (tournament_id, organization_id, stage_id, round_id, match_number, status, is_public)
  SELECT t_id, org, stage_el, r_el_qf, n, 'scheduled', true FROM generate_series(1,4) n;
  INSERT INTO matches (tournament_id, organization_id, stage_id, round_id, match_number, status, is_public)
  SELECT t_id, org, stage_el, r_el_sf, n, 'scheduled', true FROM generate_series(5,6) n;
  INSERT INTO matches (tournament_id, organization_id, stage_id, round_id, match_number, status, is_public) VALUES
    (t_id, org, stage_el, r_el_f, 7, 'scheduled', true),
    (t_id, org, stage_el, r_el_f, 8, 'scheduled', true); -- 3-е место

  -- Правила перехода B2014
  INSERT INTO qualification_rules (from_stage_id, target_stage_id, from_rank, to_rank, target_slot) VALUES
    (stage_lp, stage_cl,    1,  8, 'champions'),
    (stage_lp, stage_el,    9, 16, 'europa'),
    (stage_lp, stage_conf, 17, 22, 'conference');

  -- ══════════════════════════════════════════════════════
  -- B2015 ЭТАПЫ
  -- ══════════════════════════════════════════════════════
  INSERT INTO tournament_stages (tournament_id, organization_id, name, name_ru, name_et, type, "order", status, class_id, settings)
  VALUES (t_id, org, 'Group Stage', 'Групповой этап', 'Alagrupifaas', 'group', 1, 'active', cls_2015,
    '{"pointsWin":3,"pointsDraw":1,"pointsLoss":0,"matchDurationMinutes":20}')
  RETURNING id INTO stage_g15;

  INSERT INTO tournament_stages (tournament_id, organization_id, name, name_ru, name_et, type, "order", status, class_id, settings)
  VALUES (t_id, org, 'Playoffs', 'Плей-офф', 'Playoff', 'knockout', 2, 'pending', cls_2015,
    '{"matchDurationMinutes":20}')
  RETURNING id INTO stage_ko15;

  INSERT INTO stage_groups (stage_id, tournament_id, name, "order") VALUES (stage_g15, t_id, 'A', 1) RETURNING id INTO grp_15a;
  INSERT INTO stage_groups (stage_id, tournament_id, name, "order") VALUES (stage_g15, t_id, 'B', 2) RETURNING id INTO grp_15b;

  -- Группа A: первые 7 команд B2015
  INSERT INTO group_teams (group_id, team_id)
  SELECT grp_15a, id FROM teams WHERE tournament_id=t_id AND class_id=cls_2015 ORDER BY id LIMIT 7;
  -- Группа B: следующие 7
  INSERT INTO group_teams (group_id, team_id)
  SELECT grp_15b, id FROM teams WHERE tournament_id=t_id AND class_id=cls_2015 ORDER BY id OFFSET 7;

  INSERT INTO match_rounds (stage_id, name, name_ru, name_et, short_name, "order", match_count, is_two_legged, has_third_place) VALUES
    (stage_ko15, 'Semi-final', 'Полуфинал', 'Poolfinaal', 'SF', 2, 2, false, false),
    (stage_ko15, 'Final',      'Финал',     'Finaal',     'F',  1, 1, false, true);

  SELECT id INTO r_15sf FROM match_rounds WHERE stage_id=stage_ko15 AND short_name='SF';
  SELECT id INTO r_15f  FROM match_rounds WHERE stage_id=stage_ko15 AND short_name='F';

  INSERT INTO matches (tournament_id, organization_id, stage_id, round_id, match_number, status, is_public)
  SELECT t_id, org, stage_ko15, r_15sf, n, 'scheduled', true FROM generate_series(1,2) n;
  INSERT INTO matches (tournament_id, organization_id, stage_id, round_id, match_number, status, is_public) VALUES
    (t_id, org, stage_ko15, r_15f, 3, 'scheduled', true),
    (t_id, org, stage_ko15, r_15f, 4, 'scheduled', true);

  INSERT INTO qualification_rules (from_stage_id, target_stage_id, from_rank, to_rank, target_slot) VALUES
    (stage_g15, stage_ko15, 1, 4, 'top2_per_group');

  -- ══════════════════════════════════════════════════════
  -- B2016 ЭТАПЫ
  -- ══════════════════════════════════════════════════════
  INSERT INTO tournament_stages (tournament_id, organization_id, name, name_ru, name_et, type, "order", status, class_id, settings)
  VALUES (t_id, org, 'Group Stage', 'Групповой этап', 'Alagrupifaas', 'group', 1, 'active', cls_2016,
    '{"pointsWin":3,"pointsDraw":1,"pointsLoss":0,"matchDurationMinutes":20}')
  RETURNING id INTO stage_g16;

  INSERT INTO tournament_stages (tournament_id, organization_id, name, name_ru, name_et, type, "order", status, class_id, settings)
  VALUES (t_id, org, 'Playoffs', 'Плей-офф', 'Playoff', 'knockout', 2, 'pending', cls_2016,
    '{"matchDurationMinutes":20}')
  RETURNING id INTO stage_ko16;

  INSERT INTO stage_groups (stage_id, tournament_id, name, "order") VALUES (stage_g16, t_id, 'A', 1) RETURNING id INTO grp_16;
  INSERT INTO group_teams (group_id, team_id)
  SELECT grp_16, id FROM teams WHERE tournament_id=t_id AND class_id=cls_2016;

  INSERT INTO match_rounds (stage_id, name, name_ru, name_et, short_name, "order", match_count, is_two_legged, has_third_place) VALUES
    (stage_ko16, 'Semi-final', 'Полуфинал', 'Poolfinaal', 'SF', 2, 2, false, false),
    (stage_ko16, 'Final',      'Финал',     'Finaal',     'F',  1, 1, false, true);

  SELECT id INTO r_16sf FROM match_rounds WHERE stage_id=stage_ko16 AND short_name='SF';
  SELECT id INTO r_16f  FROM match_rounds WHERE stage_id=stage_ko16 AND short_name='F';

  INSERT INTO matches (tournament_id, organization_id, stage_id, round_id, match_number, status, is_public)
  SELECT t_id, org, stage_ko16, r_16sf, n, 'scheduled', true FROM generate_series(1,2) n;
  INSERT INTO matches (tournament_id, organization_id, stage_id, round_id, match_number, status, is_public) VALUES
    (t_id, org, stage_ko16, r_16f, 3, 'scheduled', true),
    (t_id, org, stage_ko16, r_16f, 4, 'scheduled', true);

  INSERT INTO qualification_rules (from_stage_id, target_stage_id, from_rank, to_rank, target_slot) VALUES
    (stage_g16, stage_ko16, 1, 4, 'top4');

END $$;

COMMIT;

-- Проверка
SELECT 'Classes'    AS entity, count(*)::text AS cnt FROM tournament_classes  WHERE tournament_id=1
UNION ALL SELECT 'Clubs',      count(*)::text FROM clubs               WHERE tournament_id=1
UNION ALL SELECT 'Teams',      count(*)::text FROM teams               WHERE tournament_id=1
UNION ALL SELECT 'Stages',     count(*)::text FROM tournament_stages   WHERE tournament_id=1
UNION ALL SELECT 'Groups',     count(*)::text FROM stage_groups        WHERE tournament_id=1
UNION ALL SELECT 'GroupTeams', count(*)::text FROM group_teams WHERE group_id IN (SELECT id FROM stage_groups WHERE tournament_id=1)
UNION ALL SELECT 'QualRules',  count(*)::text FROM qualification_rules WHERE from_stage_id IN (SELECT id FROM tournament_stages WHERE tournament_id=1)
UNION ALL SELECT 'Matches',    count(*)::text FROM matches             WHERE tournament_id=1;
