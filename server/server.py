#!/usr/bin/env python3

import asyncio
import websockets
import json

connections = {}
rooms = ["default"]

async def send_to_room(room, payload):
    for conn in connections.keys():
        if room in connections[conn]["rooms"]:
            await conn.send(payload)

async def send_all(payload):
    for conn in connections.keys():
        await conn.send(payload)

def list_users(target):
    users = []
    for conn in connections.keys():
        if target in connections[conn]["rooms"]:
            users.append(connections[conn]["nick"])
    return users

def validify_nick(nick):
    for conn in connections.keys():
        if nick == connections[conn]["nick"]:
            return False
    return True

async def connection_handler(websocket,path):
    try:
        print("New connection from", websocket)
        message = await websocket.recv()
        print(message)
        message_obj = json.loads(message)
        nick = message_obj["nick"]
        altered = False
        while not validify_nick(nick):
            nick = nick + "_"
            altered = True
        if altered:
            payload = json.dumps({
                "header":"INFO",
                "message":"Requested nick was taken, you are now known as {}".format(nick)
            })
            await websocket.send(payload)
        connections[websocket] = {
            "nick": nick,
            "rooms": ["default"]
        }
        print("Got nick {}".format(nick))
        payload = json.dumps({
            "header":"JOINED",
            "target":"default",
            "source":nick
        })
        await send_to_room("default", payload)
        async for message in websocket:
            message_obj = json.loads(message)
            header = message_obj["header"]
            print(message_obj)
            if header == "MSG":
                target = message_obj["target"]
                payload = json.dumps({
                    "header":"MSG",
                    "source":nick,
                    "target":target,
                    "message":message_obj["message"]
                })
                if target not in rooms:
                    payload = json.dumps({
                        "header":"INFO",
                        "message":"No such room: {}".format(target)
                    })
                else:
                    await send_to_room(target, payload)
            elif header == "PRIVMSG":
                target = message_obj["target"]
                payload = json.dumps({
                    "header":"PRIVMSG",
                    "source":nick,
                    "message":message_obj["message"]
                })
                ws = None
                for conn in connections.keys():
                    if connections[conn]["nick"]==target:
                            ws = conn
                if ws:
                    await ws.send(payload)
                else:
                    payload = json.dumps({
                        "header":"INFO",
                        "message":"No such user: {}".format(target)
                    })
                    await websocket.send(payload)

            elif header == "NICK":
                oldnick = nick
                nick = message_obj["nick"]
                altered = False
                while not validify_nick(nick):
                    nick = nick + "_"
                    altered = True
                if altered:
                    payload = json.dumps({
                        "header":"INFO",
                        "message":"Requested nick was taken, you are now known as {}".format(nick)
                    })
                    await websocket.send(payload)
                connections[websocket]["nick"]=nick
                payload = json.dumps({
                    "header":"INFO",
                    "message": "{} is now known as {}".format(oldnick,nick)
                })
                await send_all(payload)
            elif header == "JOIN":
                target = message_obj["target"]
                if target not in rooms:
                    rooms.append(target)
                connections[websocket]["rooms"].append(target)
                payload = json.dumps({
                    "header":"JOINED",
                    "target":target,
                    "source":nick
                })
                await send_to_room(target,payload)
            elif header == "PART":
                target = message_obj["target"]
                if target not in connections[websocket]["rooms"]:
                    payload = json.dumps({
                        "header":"INFO",
                        "message":"No such room: {}".format(target)
                    })
                    await websocket.send(payload)
                else:
                    connections[websocket]["rooms"].remove(target)
                    payload = json.dumps({
                        "header":"PARTED",
                        "source":nick,
                        "target":target
                    })
                    await send_to_room(target,payload)
            elif header == "LIST":
                payload = json.dumps({
                    "header":"LIST",
                    "rooms":rooms
                })
                await websocket.send(payload)
            elif header == "LISTNICKS":
                print("Got LISTNICKS request")
                target = message_obj["target"]
                if target not in rooms:
                    payload = json.dumps({
                        "header":"INFO",
                        "message":"No such room: {}".format(target)
                    })
                    await websocket.send(payload)
                else:
                    users = list_users(target)
                    payload = json.dumps({
                        "header":"LISTNICKS",
                        "target":target,
                        "users":users
                    })
                    await websocket.send(payload)
    except websockets.exceptions.ConnectionClosed:
        c = connections.pop(websocket)
        nick = c["nick"]
        for room in c["rooms"]:
            payload = json.dumps({
                "header":"PARTED",
                "source":nick,
                "target":room})
            await send_to_room(room,payload)

start_server = websockets.serve(connection_handler, 'localhost', 8080)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
