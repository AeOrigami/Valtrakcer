# Valtracker

Project for data management exam.

## Quick install

1. Install prerequisites: Node.js, Python 3, and a local MongoDB server.
2. From the project root, install frontend dependencies:
	`npm install`
3. Install backend dependencies:
	`pip install -r src/backend/requirements.txt`
4. Create a `.env` file in `src/backend/.env` with your HenrikDev API key named `KEY`:

	```env
	KEY=HDEV-your-key-here
	```

## Run

Use two terminals from the project root:

- Frontend: `npm run dev:frontend`
- Backend: `npm run dev:backend`

Or use the combined command:
`npm run dev`

## Populate the database

1. In `src/backend/.env`, set at least these values:
	- `KEY=HDEV-your-key-here`
	- `PUUID=your-starting-player-puuid`
2. Make sure MongoDB is running locally on `mongodb://localhost:27017`.
3. From the project root, run:
	`python src/backend/dbpopulate(opt).py`

This script recursively downloads players, matches, and MMR history and inserts them into the local `valtracker` database.

