# Follow the instructions below

### Backend
```bash
docker compose up -d
cd backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
```

Create `backend/.env`
```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=lioncity
CORS_ORIGINS=http://localhost:3000
LTA_ACCOUNT_KEY=your_api_key
OSRM_BASE_URL=https://router.project-osrm.org
```
```python
python server.py
```


### Frontend
```python
cd frontend
yarn install
```

Create `frontend/.env`
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
```

```python
yarn start
```
