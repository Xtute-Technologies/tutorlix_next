from .networking import install_ipv4_only_networking


install_ipv4_only_networking()

from .bot import main


if __name__ == "__main__":
    raise SystemExit(main())
