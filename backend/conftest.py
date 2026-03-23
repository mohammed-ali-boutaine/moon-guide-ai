import sys
from pathlib import Path

# Load test environment variables before any app imports
env_file = Path(__file__).parent / ".env.test"
if env_file.exists():
    from dotenv import load_dotenv

    load_dotenv(env_file)

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))
