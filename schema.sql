PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  shirt_no TEXT,
  position TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS matches (
  match_no TEXT PRIMARY KEY,
  stage TEXT NOT NULL,
  home_team_id TEXT,
  away_team_id TEXT,
  source_home TEXT,
  source_away TEXT,
  match_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  court TEXT NOT NULL DEFAULT 'Court 1',
  home_score INTEGER,
  away_score INTEGER,
  home_penalties INTEGER,
  away_penalties INTEGER,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  winner_team_id TEXT,
  sort_order INTEGER NOT NULL,
  FOREIGN KEY(home_team_id) REFERENCES teams(id),
  FOREIGN KEY(away_team_id) REFERENCES teams(id),
  FOREIGN KEY(winner_team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO meta(key,value) VALUES
('draw_completed','0'),
('draw_sequence','[]'),
('config_tournament_name','3v3 Futsal Championship'),
('config_venue','Boatyard Futsal Area'),
('config_date','2026-10-01'),
('config_start_time','09:00'),
('config_first_half','5'),
('config_halftime','5'),
('config_second_half','5'),
('config_changeover','5'),
('config_final_recovery','20'),
('config_max_squad','6'),
('config_grace_minutes','3'),
('config_arrival_minutes','5');

INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t1','Bangladesh Tiger','BGT-731',1);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t2','Thala Thalapathi','THT-482',2);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t3','150 Bar','BAR-150',3);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t4','Everest','EVR-914',4);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t5','Boot Hoist','BTH-625',5);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t6','Gina Vaahaka','GNV-378',6);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t7','Emme Baaru','EMB-843',7);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t8','Team Korakali','KRK-519',8);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t9','Wanted Cow','WTC-267',9);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t10','Short Circuit FC','SCF-604',10);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t11','Vihssaagendhaa Current','VSC-351',11);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t12','Team RMD Lions','RMD-792',12);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t13','Team Inventory','INV-438',13);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t14','Jehee Jehee','JHJ-186',14);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t15','Kuda Adi','KDA-001',15);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t16','Precast SC','PSC-001',16);
