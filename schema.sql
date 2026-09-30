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
('config_tournament_name','BOATYARD PISTON CUP 26'),
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
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t15','Kuda Adi','KDA-001',16);
INSERT OR IGNORE INTO teams(id,name,code,sort_order) VALUES('t16','Precast SC','PSC-001',15);


-- Official BOATYARD PISTON CUP 26 team rosters
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t5_01','Mannan','t5','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t5_02','Amdadul','t5','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t5_03','Nasir','t5','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t5_04','Absar','t5','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t5_05','Kayum','t5','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t5_06','Alamin','t5','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t6_01','Iyaz','t6','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t6_02','Kudey','t6','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t6_03','Miu','t6','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t6_04','Bash','t6','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t6_05','Rao','t6','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t6_06','Hammad','t6','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t13_01','Ghina','t13','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t13_02','Gaumy Nishan','t13','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t13_03','Azeem','t13','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t13_04','A. Rasheed','t13','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t13_05','Ibbe Waheed','t13','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t13_06','Ahu Nishan','t13','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t4_01','Moorthy','t4','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t4_02','Annadurai','t4','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t4_03','Manikandan','t4','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t4_04','Arjun Rai','t4','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t4_05','Sathish Kaliyan','t4','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t4_06','Alhasmi','t4','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t1_01','Nozrul','t1','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t1_02','Fahim','t1','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t1_03','Saidul Miah','t1','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t1_04','Alamgir Sarker','t1','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t1_05','Arman Molla','t1','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t1_06','M. Mansoor','t1','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t7_01','Zaain','t7','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t7_02','Jailam','t7','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t7_03','Naail','t7','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t7_04','Mohamed Hassaan','t7','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t7_05','Haarish','t7','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t7_06','Shiva Kumar','t7','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t10_01','Soharab','t10','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t10_02','Azmul Hosen','t10','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t10_03','Navedul Hasan','t10','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t10_04','MD Reyaz','t10','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t10_05','Siam Miah','t10','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t10_06','Adam Fazeeh','t10','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t16_01','Ahmed Shareef','t16','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t16_02','Ayash Faiz','t16','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t16_03','Ismail Adhuham','t16','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t16_04','Krishan','t16','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t16_05','Rahim','t16','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t16_06','Aboobakuru','t16','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t3_01','Welding Ibbe','t3','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t3_02','Aflah','t3','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t3_03','Muatte','t3','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t3_04','Ammi','t3','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t3_05','Abdulla Ibrahim','t3','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t3_06','Mahfuz','t3','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t11_01','Naseembe','t11','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t11_02','Arif','t11','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t11_03','Abser','t11','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t11_04','Rakib','t11','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t11_05','Maahil','t11','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t11_06','Ranjan','t11','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t12_01','Ariful','t12','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t12_02','Aluddin','t12','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t12_03','Maksud','t12','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t12_04','Junaid','t12','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t12_05','Giasuddin','t12','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t12_06','Ali Ahmed','t12','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t2_01','Anbara','t2','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t2_02','Libin','t2','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t2_03','Rajkumar','t2','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t2_04','Rajeshkumar','t2','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t2_05','Kamarasu','t2','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t2_06','Fauzaan','t2','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t8_01','Abbe','t8','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t8_02','Umar','t8','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t8_03','Alyaan','t8','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t8_04','Momo','t8','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t8_05','Nizar','t8','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t8_06','Muaz','t8','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t14_01','Miruty','t14','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t14_02','Rayyan','t14','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t14_03','Ali Mafaaz','t14','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t14_04','Ibrahim Mohamed','t14','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t14_05','Ahmed Mohamed','t14','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t14_06','Jameela','t14','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t9_01','Ali Waheed','t9','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t9_02','Unais','t9','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t9_03','Areesh','t9','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t9_04','Inaad','t9','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t9_05','Maanu','t9','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t9_06','Aleembe','t9','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t9_07','Raaiz','t9','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t9_08','Luham','t9','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t9_09','Mausoora','t9','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t9_10','Thaanee','t9','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t9_11','Shiraany','t9','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t15_01','Haleem','t15','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t15_02','Manoon','t15','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t15_03','Rishwan','t15','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t15_04','Ali Waheed','t15','','Player',datetime('now'));
INSERT OR IGNORE INTO players(id,name,team_id,shirt_no,position,created_at) VALUES('roster_t15_05','Hassan Hussain','t15','','Player',datetime('now'));
INSERT OR IGNORE INTO meta(key,value) VALUES('roster_version','piston-cup-roster-v1');
