from __future__ import annotations

import socket
from typing import Any


_ORIGINAL_GETADDRINFO = socket.getaddrinfo
_INSTALLED = False


def install_ipv4_only_networking() -> None:
    """Force network calls in this bot process to resolve and connect via IPv4."""
    global _INSTALLED
    if _INSTALLED:
        return

    socket.getaddrinfo = _getaddrinfo_ipv4_only  # type: ignore[assignment]

    try:
        import urllib3.util.connection as urllib3_connection
    except ImportError:
        pass
    else:
        urllib3_connection.allowed_gai_family = _urllib3_ipv4_family

    _INSTALLED = True


def _urllib3_ipv4_family() -> socket.AddressFamily:
    return socket.AF_INET


def _getaddrinfo_ipv4_only(
    host: str | bytes | None,
    port: str | int | None,
    family: int = 0,
    type: int = 0,
    proto: int = 0,
    flags: int = 0,
) -> list[tuple[Any, ...]]:
    if family == socket.AF_INET6:
        raise socket.gaierror(
            socket.EAI_FAMILY,
            "IPv6 is disabled for linkedin-banner-bot",
        )

    if family in (0, socket.AF_UNSPEC):
        family = socket.AF_INET

    results = _ORIGINAL_GETADDRINFO(host, port, family, type, proto, flags)
    return [result for result in results if result[0] != socket.AF_INET6]
