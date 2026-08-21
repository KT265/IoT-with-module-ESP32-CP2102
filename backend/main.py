import os
import re
import json
import asyncio
import unicodedata
import requests
from typing import List, Dict, Any
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import paho.mqtt.client as mqtt

# Hỗ trợ SDK google-genai mới
try:
    from google import genai
    USE_NEW_GENAI = True
except ImportError:
    import google.generativeai as genai
    USE_NEW_GENAI = False

CONFIG_FILE = "config.json"

# =========================================================================
# CHỈ GIỮ LẠI CẤU HÌNH HỆ THỐNG MẶC ĐỊNH (KHÔNG CÓ DỮ LIỆU CÁ NHÂN)
# =========================================================================
DEFAULT_CONFIG = {
    "device_id": "",
    "mqtt_broker": "broker.hivemq.com",
    "mqtt_port": 1883,
    "ai_model": "gemini-2.5-flash",
    "api_key": "",
    "owm_api_key": "",
    "crop_type": "",
    "growth_stage": "",
    "country": "Vietnam",
    "local_area": ""
}

def load_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return {**DEFAULT_CONFIG, **json.load(f)}
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()

def save_config(cfg: dict):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)

config = load_config()

current_telemetry = {
    "temp": 0.0,
    "humid": 0.0,
    "soil": 0,
    "light": 0,
    "pir": 0,
    "pump": 0,
    "pump_state": 0,
    "auto_mode": 1,
    "last_updated": datetime.now().isoformat()
}

def init_daily_history():
    return {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "labels": [],
        "temp": [],
        "humid": [],
        "soil": []
    }

daily_history = init_daily_history()
cached_forecast: List[Dict[str, Any]] = []

app = FastAPI(title="AgroLogic Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()
main_event_loop = None


# =========================================================================
# LẤY MẪU CẢM BIẾN 5 PHÚT / LẦN (CHỈ CHẠY KHI ĐÃ KẾT NỐI DEVICE ID)
# =========================================================================
async def history_5min_sampler():
    global daily_history
    while True:
        now = datetime.now()
        current_date_str = now.strftime("%Y-%m-%d")

        if current_date_str != daily_history["date"]:
            print(f"🔄 [Chart Reset] Bước sang ngày mới ({current_date_str}) -> Bắt đầu vẽ từ 00:00!")
            daily_history = init_daily_history()

        # Chỉ ghi nhận khi đã có Device ID và cảm biến có dữ liệu
        if config.get("device_id") and (current_telemetry["temp"] > 0 or current_telemetry["soil"] > 0):
            time_label = now.strftime("%H:%M")
            daily_history["labels"].append(time_label)
            daily_history["temp"].append(round(current_telemetry["temp"], 1))
            daily_history["humid"].append(round(current_telemetry["humid"], 1))
            daily_history["soil"].append(int(current_telemetry["soil"]))
            print(f"📈 [5-Min Chart Point] {time_label}: Temp={current_telemetry['temp']}°C | Humid={current_telemetry['humid']}% | Soil={current_telemetry['soil']}%")

        await asyncio.sleep(300)


# =========================================================================
# OPENWEATHERMAP (CHỈ FETCH KHI NGƯỜI DÙNG ĐÃ NHẬP ĐỦ THÔNG TIN)
# =========================================================================
VN_COORDINATES = {
    "nam dinh": (20.4200, 106.1683),
    "lam dong": (11.9404, 108.4583),
    "da lat": (11.9404, 108.4583),
    "bao loc": (11.5472, 107.8086),
    "ha noi": (21.0285, 105.8542),
    "hanoi": (21.0285, 105.8542),
    "ho chi minh": (10.8231, 106.6297),
    "da nang": (16.0544, 108.2022),
    "hai phong": (20.8449, 106.6881),
    "can tho": (10.0452, 105.7469),
    "dak lak": (12.6667, 108.0500),
    "nha trang": (12.2388, 109.1967),
    "thanh hoa": (19.8000, 105.7667),
    "nghe an": (18.6667, 105.6667)
}

def remove_accents(text: str) -> str:
    text = text.replace('đ', 'd').replace('Đ', 'D')
    normalized = unicodedata.normalize('NFD', text)
    return ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')

def get_location_coordinates(raw_location: str):
    if not raw_location:
        return 21.0285, 105.8542
    clean = remove_accents(raw_location.split(',')[0]).lower()
    for prefix in [r'^tp\.\s*', r'^tp\s+', r'^thanh pho\s+', r'^tinh\s+', r'^quan\s+', r'^huyen\s+']:
        clean = re.sub(prefix, '', clean).strip()

    for key, (lat, lon) in VN_COORDINATES.items():
        if key in clean or clean in key or key.replace(" ", "") in clean.replace(" ", ""):
            return lat, lon
    return 21.0285, 105.8542

def fetch_weather_forecast():
    global cached_forecast
    api_key = config.get("owm_api_key")
    local_area = config.get("local_area")

    if not api_key or not local_area:
        print("[Weather] Chưa cấu hình OpenWeatherMap API Key hoặc Khu vực trong Settings.")
        return

    lat, lon = get_location_coordinates(local_area)

    try:
        url = "http://api.openweathermap.org/data/2.5/forecast"
        params = {"lat": lat, "lon": lon, "appid": api_key, "units": "metric", "lang": "vi"}
        res = requests.get(url, params=params, timeout=10)

        if res.status_code == 200:
            data = res.json()
            daily_map = {}

            for item in data.get("list", []):
                date_key = item.get("dt_txt", "").split(" ")[0]
                temp = item["main"]["temp"]
                humid = item["main"]["humidity"]
                wind = item["wind"]["speed"]
                rain = item.get("rain", {}).get("3h", 0.0)
                status = item["weather"][0]["description"].title()
                main_weather = item["weather"][0]["main"]

                if date_key not in daily_map:
                    daily_map[date_key] = {
                        "date": date_key, "temps": [], "humids": [],
                        "winds": [], "rainfall": 0.0, "status": status,
                        "main_weather": main_weather
                    }
                daily_map[date_key]["temps"].append(temp)
                daily_map[date_key]["humids"].append(humid)
                daily_map[date_key]["winds"].append(wind)
                daily_map[date_key]["rainfall"] += rain

            formatted_list = []
            for date_key, val in daily_map.items():
                min_t = min(val["temps"])
                max_t = max(val["temps"])
                avg_h = sum(val["humids"]) / len(val["humids"])
                avg_w = (sum(val["winds"]) / len(val["winds"])) * 3.6

                formatted_list.append({
                    "date": date_key,
                    "status": val["status"],
                    "main_weather": val["main_weather"],
                    "temp_range": f"{max_t:.1f}° / {min_t:.1f}°",
                    "humidity": f"{avg_h:.0f}%",
                    "wind": f"{avg_w:.1f} km/h",
                    "rainfall": f"{val['rainfall']:.1f} mm"
                })

            cached_forecast = formatted_list
            print(f"✅ [Weather] Đã lấy thành công {len(cached_forecast)} ngày dự báo thời tiết thực tế.")
    except Exception as e:
        print(f"❌ [Weather] Lỗi: {e}")

async def weather_periodic_scheduler():
    while True:
        try:
            fetch_weather_forecast()
        except Exception as e:
            print(f"[Weather Error]: {e}")
        await asyncio.sleep(7200)


# =========================================================================
# MQTT CLIENT
# =========================================================================
def on_mqtt_connect(client, userdata, flags, rc):
    dev_id = config.get("device_id")
    if dev_id:
        topic = f"farm/{dev_id}/telemetry"
        client.subscribe(topic)
        print(f"[MQTT] Đã kết nối Broker và lắng nghe: {topic}")
    else:
        print("[MQTT] Đã kết nối Broker. Đang đợi người dùng nhập Device ID từ Web Settings...")

def on_mqtt_message(client, userdata, msg):
    global current_telemetry, main_event_loop
    try:
        payload = json.loads(msg.payload.decode())
        current_telemetry.update(payload)
        current_telemetry["last_updated"] = datetime.now().isoformat()

        if main_event_loop and main_event_loop.is_running():
            asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast({"type": "telemetry", "data": current_telemetry}),
                main_event_loop
            )
    except Exception as e:
        print(f"[MQTT] Error message: {e}")

mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_mqtt_connect
mqtt_client.on_message = on_mqtt_message

def start_mqtt():
    try:
        mqtt_client.connect(config["mqtt_broker"], int(config.get("mqtt_port", 1883)), 60)
        mqtt_client.loop_start()
    except Exception as e:
        print(f"[MQTT] Không thể kết nối broker: {e}")


# =========================================================================
# LIFECYCLE & ROUTES
# =========================================================================
@app.on_event("startup")
async def startup_event():
    global main_event_loop
    main_event_loop = asyncio.get_running_loop()
    start_mqtt()
    asyncio.create_task(weather_periodic_scheduler())
    asyncio.create_task(history_5min_sampler())

@app.get("/api/settings")
def get_settings():
    return config

@app.post("/api/settings")
def update_settings(new_cfg: dict):
    global config
    old_device_id = config.get("device_id")
    config.update(new_cfg)
    save_config(config)

    # Đổi topic MQTT nếu thay đổi Device ID
    new_device_id = config.get("device_id")
    if new_device_id and new_device_id != old_device_id:
        try:
            if old_device_id:
                mqtt_client.unsubscribe(f"farm/{old_device_id}/telemetry")
            topic = f"farm/{new_device_id}/telemetry"
            mqtt_client.subscribe(topic)
            print(f"[MQTT] Đã chuyển sang lắng nghe Device ID: {new_device_id}")
        except Exception as e:
            print(f"[MQTT] Error re-sub: {e}")

    fetch_weather_forecast()
    return {"status": "success", "config": config}

@app.get("/api/telemetry")
def get_telemetry():
    return current_telemetry

@app.get("/api/analytics")
def get_analytics():
    return daily_history

@app.get("/api/forecast")
def get_forecast():
    return {"status": "success", "data": cached_forecast}

@app.post("/api/control")
def send_control(cmd: dict):
    dev_id = config.get("device_id")
    if not dev_id:
        return {"status": "error", "message": "Chưa cấu hình Device ID trong Settings"}
    topic = f"farm/{dev_id}/control"
    mqtt_client.publish(topic, json.dumps(cmd))
    return {"status": "sent", "command": cmd}

@app.post("/api/ai-analyze")
def run_ai_analysis():
    api_key = config.get("api_key")
    if not api_key:
        return {"status": "error", "message": "Vui lòng nhập Google Gemini API Key trong Settings trước."}

    try:
        # Chuẩn bị tóm tắt thời tiết
        weather_summary = "Chưa có dữ liệu dự báo"
        if cached_forecast:
            weather_summary = "\n".join([
                f"- Ngày {d['date']}: {d['status']} | Nhiệt độ: {d['temp_range']} | Ẩm: {d['humidity']} | Mưa: {d['rainfall']}"
                for d in cached_forecast[:5]
            ])

        prompt = f"""
        Bạn là Bác sĩ Nông nghiệp & Chuyên gia Tối ưu Nông trại AgroLogic.

        THÔNG TIN CANH TÁC:
        - Cây trồng: {config.get('crop_type', 'Cây trồng')} ({config.get('growth_stage', 'Đang phát triển')})
        - Khu vực: {config.get('local_area', 'Việt Nam')}, {config.get('country', 'Vietnam')}

        DỮ LIỆU CẢM BIẾN THỰC TẾ (REALTIME):
        - Nhiệt độ hiện tại: {current_telemetry['temp']} °C
        - Độ ẩm không khí: {current_telemetry['humid']} %
        - Độ ẩm đất: {current_telemetry['soil']} %
        - Nắng: {"Nắng gắt" if current_telemetry['light'] == 1 else "Râm mát / Đêm"}

        DỰ BÁO THỜI TIẾT 5-7 NGÀY TỚI:
        {weather_summary}

        NHIỆM VỤ:
        1. Đánh giá trạng thái vi khí hậu và phân tích rủi ro sâu bệnh theo dự báo thời tiết.
        2. Quyết định 2 ngưỡng ẩm đất kiểm soát tưới:
           - trigger: Ngưỡng ẩm đất % bắt đầu tưới (từ 20 đến 55).
           - target: Ngưỡng ẩm đất % ngắt bơm (từ 50 đến 85).

        BẮT BUỘC TRẢ VỀ JSON DUY NHẤT THEO SCHEMA SAU:
        {{
            "status_summary": "Tóm tắt trạng thái vi khí hậu (1-2 câu)",
            "ai_action": "Hành động điều khiển tưới chi tiết (1-2 câu)",
            "disease_warning": "Cảnh báo sâu bệnh và phòng ngừa",
            "trigger": 40,
            "target": 60
        }}
        """

        # Danh sách model ưu tiên (ưu tiên model người dùng chọn trong settings)
        chosen_model = config.get("ai_model", "gemini-3.5-flash")
        candidate_models = [chosen_model, "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-pro", "gemini-2.5-flash"]
        # Loại bỏ trùng lặp giữ nguyên thứ tự
        candidate_models = list(dict.fromkeys(candidate_models))

        raw_text = ""
        last_error = ""

        if USE_NEW_GENAI:
            client = genai.Client(api_key=api_key)
            for m in candidate_models:
                try:
                    res = client.models.generate_content(
                        model=m,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        ) if 'types' in globals() else None
                    )
                    if res and res.text:
                        raw_text = res.text
                        print(f"🤖 [AI Success] Phân tích thành công bằng model: {m}")
                        break
                except Exception as e:
                    last_error = str(e)
                    print(f"⚠️ [AI Try] Model {m} lỗi: {e}")
                    continue
        else:
            genai.configure(api_key=api_key)
            for m in candidate_models:
                try:
                    model = genai.GenerativeModel(
                        m,
                        generation_config={"response_mime_type": "application/json"}
                    )
                    res = model.generate_content(prompt)
                    if res and res.text:
                        raw_text = res.text
                        print(f"🤖 [AI Success] Phân tích thành công bằng model: {m}")
                        break
                except Exception as e:
                    last_error = str(e)
                    print(f"⚠️ [AI Try] Model {m} lỗi: {e}")
                    continue

        if not raw_text:
            return {
                "status": "error",
                "message": f"Không thể gọi AI: {last_error or 'Kiểm tra lại API Key hoặc kết nối mạng'}"
            }

        # Trích xuất phần JSON an toàn bằng Regex
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if not json_match:
            return {"status": "error", "message": f"AI không trả về đúng định dạng JSON: {raw_text[:100]}"}

        decision = json.loads(json_match.group(0))

        # Gửi ngưỡng tưới tối ưu tự động xuống ESP32
        send_control({
            "mode": "auto",
            "trigger": int(decision.get("trigger", 40)),
            "target": int(decision.get("target", 60))
        })

        return {"status": "success", "decision": decision}

    except Exception as e:
        return {"status": "error", "message": f"Lỗi xử lý: {str(e)}"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        await websocket.send_json({"type": "init", "telemetry": current_telemetry, "config": config})
        while True: await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)