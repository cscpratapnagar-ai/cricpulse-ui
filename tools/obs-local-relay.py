#!/usr/bin/env python3
"""Loopback-only WebSocket relay for CricPulse scorer <-> OBS Browser Source.

Run with: python tools/obs-local-relay.py
The relay binds only to 127.0.0.1 and forwards text frames between local clients.
"""
from __future__ import annotations

import base64
import hashlib
import socket
import socketserver
import struct
import threading

HOST = "127.0.0.1"
PORT = 8765
CLIENTS: set[socket.socket] = set()
CLIENTS_LOCK = threading.Lock()


def recv_exact(sock: socket.socket, size: int) -> bytes:
    data = bytearray()
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise ConnectionError("client disconnected")
        data.extend(chunk)
    return bytes(data)


def send_frame(sock: socket.socket, opcode: int, payload: bytes) -> None:
    first = 0x80 | (opcode & 0x0F)
    length = len(payload)
    if length < 126:
        header = struct.pack("!BB", first, length)
    elif length <= 0xFFFF:
        header = struct.pack("!BBH", first, 126, length)
    else:
        header = struct.pack("!BBQ", first, 127, length)
    sock.sendall(header + payload)


def broadcast(sender: socket.socket, payload: bytes) -> None:
    dead: list[socket.socket] = []
    with CLIENTS_LOCK:
        recipients = [client for client in CLIENTS if client is not sender]
    for client in recipients:
        try:
            send_frame(client, 0x1, payload)
        except OSError:
            dead.append(client)
    if dead:
        with CLIENTS_LOCK:
            for client in dead:
                CLIENTS.discard(client)
                try:
                    client.close()
                except OSError:
                    pass


class RelayHandler(socketserver.BaseRequestHandler):
    def handle(self) -> None:
        client = self.request
        client.settimeout(30)
        try:
            request = bytearray()
            while b"\r\n\r\n" not in request:
                chunk = client.recv(4096)
                if not chunk:
                    return
                request.extend(chunk)
                if len(request) > 16384:
                    return
            headers = {}
            for line in bytes(request).decode("latin1").split("\r\n")[1:]:
                if ":" in line:
                    key, value = line.split(":", 1)
                    headers[key.strip().lower()] = value.strip()
            if headers.get("upgrade", "").lower() != "websocket":
                client.sendall(b"HTTP/1.1 426 Upgrade Required\r\nConnection: close\r\n\r\n")
                return
            key = headers.get("sec-websocket-key")
            if not key:
                return
            accept = base64.b64encode(
                hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()
            ).decode()
            response = (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
            )
            client.sendall(response.encode("ascii"))
            client.settimeout(None)
            with CLIENTS_LOCK:
                CLIENTS.add(client)

            while True:
                first, second = recv_exact(client, 2)
                opcode = first & 0x0F
                masked = bool(second & 0x80)
                length = second & 0x7F
                if length == 126:
                    length = struct.unpack("!H", recv_exact(client, 2))[0]
                elif length == 127:
                    length = struct.unpack("!Q", recv_exact(client, 8))[0]
                if length > 2 * 1024 * 1024:
                    send_frame(client, 0x8, b"\x03\xf1")
                    return
                mask = recv_exact(client, 4) if masked else b""
                payload = recv_exact(client, length) if length else b""
                if masked:
                    payload = bytes(value ^ mask[index % 4] for index, value in enumerate(payload))
                if opcode == 0x8:
                    try:
                        send_frame(client, 0x8, payload)
                    except OSError:
                        pass
                    return
                if opcode == 0x9:
                    send_frame(client, 0xA, payload)
                elif opcode == 0x1:
                    broadcast(client, payload)
        except (ConnectionError, OSError, ValueError, struct.error):
            pass
        finally:
            with CLIENTS_LOCK:
                CLIENTS.discard(client)


class ThreadedRelay(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with ThreadedRelay((HOST, PORT), RelayHandler) as server:
        print(f"CricPulse OBS local relay listening at ws://{HOST}:{PORT}/ws")
        print("Keep this window open while scoring and streaming. Press Ctrl+C to stop.")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping CricPulse OBS local relay.")
