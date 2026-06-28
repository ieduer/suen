#!/bin/bash
echo "Starting build script..."
set -e # Exit on error

# ... (前面的 LFS install, fetch, pull 不變) ...

echo "LFS pull completed."

# --- 修改後的複製步驟 ---
echo "Copying fonts directory to relevant build output directories..."

# 複製到 allinone (如果 allinone 項目需要)
echo "Copying to allinone..."
mkdir -p allinone/fonts
cp -r fonts allinone/

echo "Preparing allinone nested PWA paths..."
mkdir -p allinone/allinone
cp allinone/index.html allinone/allinone/index.html
cp allinone/manifest.json allinone/allinone/manifest.json
cp allinone/sw.js allinone/allinone/sw.js

# 複製到 blogs (如果 blogs 項目需要)
echo "Copying to blogs..."
mkdir -p blogs/fonts
cp -r fonts blogs/

# 複製到 school-links (如果 school-links 項目需要)
echo "Copying to school-links..."
mkdir -p school-links/fonts
cp -r fonts school-links/

# ... 為其他需要部署的子文件夾添加類似的 mkdir 和 cp 命令 ...
echo "Copying to sharing..."
mkdir -p sharing/fonts
cp -r fonts sharing/

# ... 為其他需要部署的子文件夾添加類似的 mkdir 和 cp 命令 ...
echo "Copying to HomeSchoolBridge..."
mkdir -p HomeSchoolBridge/fonts
cp -r fonts HomeSchoolBridge/

echo "Fonts copied."
# --- 複製步驟結束 ---

echo "Build script finished."
exit 0
