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

