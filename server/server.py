#!/usr/bin/env python3

import asyncio
import websockets

connections = {}

async def connection_handler(websocket,path):
    try:
        print("New connection from", websocket)
        nick = await websocket.recv()
        connections[websocket] = nick
        print("Got nick {}".format(nick))
        await websocket.send("Welcome to the chat room!")
        for conn in connections.keys():
            await conn.send("{} has joined the chat room!".format(nick))
        async for message in websocket:
            print("Got message {}".format(message))
            for conn in connections.keys():
                await conn.send("{}: {}".format(nick,message))
    except websockets.exceptions.ConnectionClosed:
        nick = connections.pop(websocket)
        for conn in connections.keys():
            conn.send("{} has disconnected.".format(nick))

start_server = websockets.serve(connection_handler, 'localhost', 8080)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()

