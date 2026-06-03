# LionCity AI-Logistics

Hệ thống quản lý Hub và điều phối giao hàng thông minh (AI-Logistics).

## 🚀 Hướng dẫn cài đặt nhanh

### 1. Cơ sở dữ liệu (MongoDB)
Khởi chạy MongoDB bằng Docker:
```bash
docker compose up -d
```

### 2. Cài đặt Backend
Di chuyển vào thư mục backend và thiết lập môi trường ảo:
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Tạo file `backend/.env` (nếu chưa có):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=lioncity
CORS_ORIGINS=http://localhost:3000
LTA_ACCOUNT_KEY=your_api_key
OSRM_BASE_URL=https://router.project-osrm.org
```

### 3. Khởi tạo dữ liệu (Seeding) - QUAN TRỌNG
Hệ thống cần được nạp dữ liệu mẫu và tài khoản người dùng để có thể hoạt động:

**Bước 1: Nạp dữ liệu Hub, Driver, Vehicle từ backup:**
```bash
python trigger_seed.py
```

**Bước 2: Tạo tài khoản người dùng mặc định:**
```bash
python seed_users.py
```

**Bước 3 (Tùy chọn): Tự động gán đơn hàng cho tài xế để test Route Planning nhanh:**
```bash
python ready_demo.py
```

Chạy Server Backend:
```bash
python server.py
```

### 4. Cài đặt Frontend
Di chuyển vào thư mục frontend:
```bash
cd frontend
yarn install  # hoặc npm install
```

Tạo file `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

Chạy Frontend:
```bash
yarn start
```

## 🔑 Thông tin đăng nhập mặc định
Sau khi chạy các lệnh seed, bạn có thể đăng nhập bằng các tài khoản sau:

| Vai trò | Email | Mật khẩu |
| :--- | :--- | :--- |
| **Hub Manager** | `manager1234@gmail.com` | `huy1234@` |
| **Super Admin** | `superadmin1234@gmail.com` | `huy1234@` |
| **Shipper** | `shipper1234@gmail.com` | `huy1234@` |

---
*Lưu ý: Nếu bạn gặp lỗi Authentication failed, hãy đảm bảo đã chạy script `seed_users.py` và khởi động lại frontend.*
