#!/usr/bin/env python3
"""
圖片識別 + 日文翻譯腳本
使用 Ollama 的 vision 模型進行物件識別，然後翻譯成日文
"""

import sys
import json
import subprocess
import requests
import base64
import argparse
import tempfile
import os


def download_image(url, local_path):
    """下載圖片到本地"""
    try:
        response = requests.get(url)
        if response.status_code == 200:
            with open(local_path, "wb") as f:
                f.write(response.content)
            return local_path
        else:
            print(f"錯誤：無法下載圖片，HTTP status code: {response.status_code}")
            return None
    except Exception as e:
        print(f"錯誤：下載圖片失敗 - {e}")
        return None


def get_ollama_response(image_path, model="llava"):
    """
    使用 Ollama 進行圖片識別
    """
    try:
        # 檢查模型是否可用
        result = subprocess.run(["ollama", "list"], capture_output=True, text=True)

        if model not in result.stdout:
            print(f"錯誤：模型 {model} 未找到，請先執行: ollama pull {model}")
            return None

        # 讀取並編碼圖片
        with open(image_path, "rb") as f:
            image_data = f.read()
            # 編碼為 base64
            image_base64 = base64.b64encode(image_data).decode("utf-8")

        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": "請詳細描述這張圖片中的主要物體，用英文回答。只列出你看到的物體名稱，例如：apple, cat, keyboard 等。如果有多個物體，用逗號分隔。",
                "images": [image_base64],
                "stream": False,
            },
        )

        if response.status_code == 200:
            result = response.json()
            return result.get("response", "").strip()
        else:
            print(f"Ollama API 錯誤: {response.status_code}")
            return None

    except Exception as e:
        print(f"錯誤: {e}")
        return None


def translate_to_japanese(text, model="llava"):
    """
    使用 Ollama 翻譯成日文
    """
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": f"將以下英文物體名稱翻譯成日文，並加上假名讀音（振假名）。格式如下：\n\n物體名稱 (日文讀音)\n\n例如：\n\napple (りんご)\n\ncat (ねこ)\n\n請翻譯：{text}",
                "stream": False,
            },
        )

        if response.status_code == 200:
            result = response.json()
            return result.get("response", "").strip()
        else:
            print(f"Ollama API 錯誤: {response.status_code}")
            return None

    except Exception as e:
        print(f"錯誤: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="圖片識別 + 日文翻譯")
    parser.add_argument("input", help="圖片路徑或 URL")
    parser.add_argument(
        "--model", "-m", default="llava", help="使用的模型 (預設: llava)"
    )

    args = parser.parse_args()
    input_path = args.input
    model = args.model
    is_mobile = True

    # 判斷是 URL 還是本地路徑
    is_url = input_path.startswith("http://") or input_path.startswith("https://")

    if is_url:
        # 下載圖片
        import tempfile

        # 從 URL 提取副檔名
        ext = "jpg"  # 預設為 jpg
        if "." in input_path.split("?")[0]:
            ext = input_path.split("?")[0].split(".")[-1]

        # 創建臨時目錄和文件
        temp_dir = tempfile.mkdtemp()
        local_path = os.path.join(temp_dir, f"downloaded_image.{ext}")

        local_path = download_image(input_path, local_path)
        if not local_path:
            sys.exit(1)

        input_path = local_path

    # 1. 識別物體
    objects = get_ollama_response(input_path, model)

    if not objects:
        sys.exit(1)

    # 2. 翻譯成日文
    japanese = translate_to_japanese(objects, model)

    if not japanese:
        sys.exit(1)

    # 手機版：簡潔輸出
    for line in japanese.split("\n"):
        line = line.strip()
        if line and not line.startswith(("-", "=", "+", "*")):
            print(line)


if __name__ == "__main__":
    main()
