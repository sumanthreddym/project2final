import os
import asyncio
from azure.iot.device.aio import IoTHubDeviceClient
import asyncio
import sys
import signal
import threading
from azure.iot.device.aio import IoTHubModuleClient
from azure.iot.device import Message
import time
import csv
import json

user_1_id = "QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL"
user_2_id = "QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm"

user = user_2_id
start = 150
end = 300

# {
# "userId":"QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL",
# "heartrate":"74.67789"
# }

async def main():
    # Create instance of the device client using the connection string
    device_client = IoTHubModuleClient.create_from_edge_environment()

    # Connect the device client.
    await device_client.connect()

    await device_client.send_message("message queue started")

    line_count = 0
    while True:
        with open('data.csv') as csv_file:
            csv_reader = csv.reader(csv_file, delimiter=',')
            for row in csv_reader:
                if line_count < start:
                    line_count += 1
                    continue
                elif line_count >= end:
                    line_count += 1
                    break
                else:
                    for i in range(0, len(row)-1):
                        message = {}
                        message["userId"] = user
                        message["heartrate"] = row[i]
                        await device_client.send_message(str(json.dumps(message)))
                        time.sleep(1)
                    line_count += 1



        # # Send a single message
        # print("Sending message...")
        # await device_client.send_message("kj2056 message success " + str(i))
        # print("Message successfully sent! " + str(i))
        # time.sleep(1)
        
    
    # Finally, shut down the client
    await device_client.shutdown()


if __name__ == "__main__":

    # If using Python 3.6 use the following code instead of asyncio.run(main()):
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
    loop.close()

