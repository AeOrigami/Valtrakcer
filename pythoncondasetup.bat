@echo off
REM Set your environment name here
set ENV_NAME=dataM

REM Create new conda environment with Python 3.13 (change version if needed)
conda create -y -n %ENV_NAME% python=3.11.14

REM Activate the new environment
call conda activate %ENV_NAME%

REM Install requirements
pip install -r src\backend\requirements.txt

echo Environment %ENV_NAME% is ready!
pause