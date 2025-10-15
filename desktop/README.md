# Gradalyze Desktop App

Desktop application for Raspberry Pi GPIO control with Supabase integration.

## Features

- User authentication (login/signup)
- GPIO motor control
- Data sampling
- Supabase cloud sync
- Modern dark UI

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run the app
python main.py
```

## GPIO Pin Configuration

- Pin 18: Motor Forward
- Pin 19: Motor Reverse  
- Pin 21: Sensor Input

## Requirements

- Python 3.7+
- Raspberry Pi
- RPi.GPIO library
- Supabase account

## Environment Variables

Create a `.env` file with:
```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
```
