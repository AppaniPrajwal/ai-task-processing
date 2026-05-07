import os
import json
import time
import redis
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
import certifi
from datetime import datetime, timezone

load_dotenv()

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/ai-tasks')

r = redis.from_url(REDIS_URL)
client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = client.get_default_database()
tasks_collection = db['tasks']

def process_task(task_data):
    task_id = task_data['taskId']
    input_text = task_data['inputText']
    operation = task_data['operation']
    
    # Update status to running
    tasks_collection.update_one(
        {'_id': ObjectId(task_id)},
        {
            '$set': {'status': 'running'},
            '$push': {'logs': {
                'level': 'info', 
                'message': 'Task started processing...',
                'timestamp': datetime.now(timezone.utc)
            }}
        }
    )
    
    time.sleep(2)  # Simulate some heavy processing

    try:
        result = ""
        if operation == 'uppercase':
            result = input_text.upper()
        elif operation == 'lowercase':
            result = input_text.lower()
        elif operation == 'reverse string':
            result = input_text[::-1]
        elif operation == 'word count':
            result = str(len(input_text.split()))
        else:
            raise ValueError(f"Unknown operation: {operation}")

        # Success
        tasks_collection.update_one(
            {'_id': ObjectId(task_id)},
            {
                '$set': {
                    'status': 'success',
                    'result': result,
                },
                '$push': {'logs': {
                    'level': 'info',
                    'message': f"Operation {operation} completed successfully.",
                    'timestamp': datetime.now(timezone.utc)
                }}
            }
        )
    except Exception as e:
        # Failed
        tasks_collection.update_one(
            {'_id': ObjectId(task_id)},
            {
                '$set': {
                    'status': 'failed',
                },
                '$push': {'logs': {
                    'level': 'error',
                    'message': f"Error: {str(e)}",
                    'timestamp': datetime.now(timezone.utc)
                }}
            }
        )

def main():
    print("Worker is listening for tasks...", flush=True)
    while True:
        try:
            # Blocking pop from list
            _, message = r.brpop('task_queue', timeout=0)
            if message:
                task_data = json.loads(message.decode('utf-8'))
                print(f"Processing task {task_data['taskId']}", flush=True)
                process_task(task_data)
        except Exception as e:
            print(f"Worker Error: {str(e)}", flush=True)
            time.sleep(5)

if __name__ == "__main__":
    main()
