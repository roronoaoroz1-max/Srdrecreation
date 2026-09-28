# 3v3 Futsal — GitHub + Cloudflare Pages + D1

## Architecture

- **GitHub repository:** stores frontend and backend source code.
- **Cloudflare Pages:** serves `index.html`, `styles.css`, and `app.js`.
- **Cloudflare Pages Functions:** runs the `/api/...` backend routes from the `functions/` folder.
- **Cloudflare D1:** stores teams, players, draw, matches, scores and announcements.

GitHub is the code source, not a live database/runtime.

## Admin credentials

Configure these in Cloudflare Pages environment variables:

- `ADMIN_USERNAME` = `admin`
- `ADMIN_PASSWORD` = `admin123`
- `ADMIN_SECRET` = a long random secret, e.g. 40+ random characters

Do not commit the password or secret into GitHub.

## 1 — Upload to GitHub

Create a new GitHub repository, then upload **all files and folders from this ZIP**, including the `functions` folder.

Recommended repository name:

`3v3-futsal-tournament`

## 2 — Create the Cloudflare Pages site

Cloudflare Dashboard → Workers & Pages → Create application → Pages → Import an existing Git repository.

Choose your GitHub repository.

Use:

- Production branch: `main`
- Framework preset: None
- Build command: `exit 0`
- Build output directory: `.`
- Root directory: leave blank

Deploy.

## 3 — Create D1

Cloudflare Dashboard → D1 → Create database.

Suggested name:

`futsal-tournament-db`

Open the D1 database console and execute the complete `schema.sql` file.

This creates the 14 teams and all required tables.

## 4 — Bind D1 to Pages Functions

Cloudflare → Workers & Pages → your Pages project → Settings → Bindings.

Add:

- Type: D1 database
- Variable name: `DB`
- Database: `futsal-tournament-db`

Save and redeploy the Pages project.

The variable name **must be DB**.

## 5 — Add admin environment variables

Cloudflare → Workers & Pages → your Pages project → Settings → Variables and Secrets.

Add:

`ADMIN_USERNAME` = `admin`

`ADMIN_PASSWORD` = `admin123`

`ADMIN_SECRET` = a long random value such as:

`change-this-to-a-long-random-secret-8Hk2mR9xQ4zP7vN6`

Prefer making the password and secret encrypted/secret variables if the dashboard offers that option.

Redeploy after saving.

## 6 — Open your public site

Cloudflare will give you a URL similar to:

`https://3v3-futsal-tournament.pages.dev`

Anyone can open it from anywhere.

Admin:
- username `admin`
- password `admin123`

## Animated draw

Admin → Start animated draw.

The backend creates the random result once and stores it in D1. The browser then reveals the already-recorded draw one team at a time:

1. BYE A
2. BYE B
3. M1 Team 1
4. M1 Team 2
5. M2 Team 1
6. M2 Team 2
7. ... until all 14 teams are shown

Every player sees the same saved draw.

## Automatic deployment

Once GitHub is connected to Cloudflare Pages, changes pushed to the production branch automatically trigger a new Pages deployment.

## Security note

`admin123` is intentionally simple because it was requested. For a public internet deployment, changing it to a stronger password after testing is strongly recommended.


## Manual draw

Admin now has two draw modes:

### Automatic animated draw
The system randomly selects:
- BYE A
- BYE B
- M1 Team 1 / Team 2
- M2 Team 1 / Team 2
- through M6

The reveal animation is still shown one team at a time.

### Manual draw
Use **Admin → Tournament draw → Manual draw**.

Choose:
1. BYE A
2. BYE B
3. M1 Team 1
4. M1 Team 2
5. ...
14. M6 Team 2

Every team must appear exactly once. Press **Save manual draw & generate bracket**.

The QF → SF → Final structure and times are generated automatically.

## Team Manager

Admin → **Enter / edit the 14 teams**

You can change:
- all 14 team names
- all 14 private player login codes

Press **Save team list**.

This means the same website can be reused for another 14-team tournament without editing SQL or source code.

If a draw already exists, it is best to reset or create a new draw after changing the teams.


## Draw letters A–N

The tournament now uses fixed draw letters:

- **A** — direct to QF1
- **B vs C** — M1
- **D vs E** — M2
- **F vs G** — M3
- **H** — direct to QF3
- **I vs J** — M4
- **K vs L** — M5
- **M vs N** — M6

QF1: A vs Winner M1  
QF2: Winner M2 vs Winner M3  
QF3: H vs Winner M4  
QF4: Winner M5 vs Winner M6

Players log in using:
- their name
- their team's draw letter
- optional shirt number
- position

Player login is available after the official draw has been completed.

## One-page Guide

The website includes a **Guide** page explaining:
- tournament format
- A–N letter positions
- direct-quarterfinal letters
- Round 1 match mapping
- QF/SF/Final progression
- match timing
- penalties
- player login process
