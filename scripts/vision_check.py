#!/usr/bin/env python3
"""
圖片識別 + 多語言翻譯腳本
使用 Ollama 的 vision 模型進行物件識別，然後翻譯成多語言
"""

import sys
import json
import subprocess
import requests
import base64
import argparse
import tempfile
import os
import re


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
                "prompt": "Please identify the main objects in this image. List ONLY the object names in English, separated by commas. Example format: apple, cat, keyboard. Do not include any explanations, sentences, or extra text.",
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


def translate_to_chinese(text, model="llava"):
    """
    使用 Ollama 翻譯成繁體中文
    """
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": f"Translate the following English word to Traditional Chinese. Return ONLY the translated word, no explanations or extra text.\n\n{text}",
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
                "prompt": f"Translate the following English word to Japanese with hiragana reading. Format: Japanese word (ひらがな). Return ONLY this format, no explanations or extra text.\n\n{text}",
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


def translate_to_korean(text, model="llava"):
    """
    使用 Ollama 翻譯成韓文
    """
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": f"Translate the following English word to Korean. Return ONLY the translated word, no explanations or extra text.\n\n{text}",
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


def clean_text(text):
    """清理文本，移除多餘的標點符號和空白"""
    text = text.strip()
    # 移除前後的點號、逗號等
    text = re.sub(r"^[.,、\s]+", "", text)
    text = re.sub(r"[.,、\s]+$", "", text)
    return text


def parse_objects(text):
    """解析物體列表，支援逗號和換行分隔"""
    # 先嘗試按逗號分割
    objects = [obj.strip() for obj in text.split(",") if obj.strip()]

    # 如果沒有逗號，嘗試按換行分割
    if len(objects) == 1:
        objects = [obj.strip() for obj in text.split("\n") if obj.strip()]

    return objects


def main():
    parser = argparse.ArgumentParser(description="圖片識別 + 多語言翻譯")
    parser.add_argument("input", help="圖片路徑或 URL")
    parser.add_argument(
        "--model", "-m", default="llava", help="使用的模型 (預設: llava)"
    )

    args = parser.parse_args()
    input_path = args.input
    model = args.model

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

    # 1. 識別物體 (英文)
    objects = get_ollama_response(input_path, model)

    if not objects:
        sys.exit(1)

    # 2. 解析英文物體列表
    english_objects = parse_objects(objects)

    if not english_objects:
        print("未能識別到物體")
        sys.exit(1)

    # 3. 逐個翻譯成各語言
    results = []
    for en in english_objects:
        en_clean = clean_text(en)

        # 翻譯成各語言
        zh = translate_to_chinese(en_clean, model)
        if zh:
            zh = clean_text(zh)
        else:
            zh = ""

        ja = translate_to_japanese(en_clean, model)
        if ja:
            ja = clean_text(ja)
        else:
            ja = ""

        ko = translate_to_korean(en_clean, model)
        if ko:
            ko = clean_text(ko)
        else:
            ko = ""

        results.append((en_clean, zh, ja, ko))

    # 4. 輸出結果
    for en, zh, ja, ko in results:
        print(f"{en} | {zh} | {ja} | {ko}\n")


if __name__ == "__main__":
    main()
