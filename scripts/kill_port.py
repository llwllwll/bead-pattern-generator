import subprocess
import time

result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
lines = result.stdout.split('\n')
pids = set()
for line in lines:
    if ':8000' in line and 'LISTENING' in line:
        parts = line.split()
        if len(parts) >= 5:
            pid = parts[-1]
            pids.add(pid)

print(f"Found PIDs: {pids}")

for pid in pids:
    try:
        subprocess.run(['taskkill', '/F', '/PID', pid], capture_output=True)
        print(f"Killed PID {pid}")
    except Exception as e:
        print(f"Failed to kill PID {pid}: {e}")

time.sleep(2)
print("Done")
