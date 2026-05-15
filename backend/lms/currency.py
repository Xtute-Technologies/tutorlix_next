import json
import logging
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.cache import cache
from rest_framework.exceptions import ValidationError


logger = logging.getLogger(__name__)

INR = "INR"
USD = "USD"

PAYMENT_CURRENCY_CHOICES = (
    (INR, "Indian Rupee"),
    (USD, "US Dollar"),
)

USD_INR_CACHE_KEY = "lms:exchange-rate:usd-inr"

DEFAULT_EXCHANGE_RATE_PROVIDERS = (
    "https://api.frankfurter.dev/v2/latest?base=USD&symbols=INR",
    "https://open.er-api.com/v6/latest/USD",
    "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
)


def extract_usd_inr_rate(payload):
    raw_rate = None

    if isinstance(payload, dict):
        if payload.get("rate") is not None:
            raw_rate = payload.get("rate")
        elif isinstance(payload.get("rates"), dict):
            raw_rate = payload["rates"].get(INR)
        elif isinstance(payload.get("conversion_rates"), dict):
            raw_rate = payload["conversion_rates"].get(INR)
        elif isinstance(payload.get("usd"), dict):
            raw_rate = payload["usd"].get("inr")

    try:
        rate = Decimal(str(raw_rate))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"Invalid USD/INR rate received: {raw_rate}") from exc

    if rate <= 0:
        raise ValueError(f"USD/INR rate must be greater than zero: {rate}")

    return rate


def fetch_rate_from_provider(url, timeout):
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Tutorlix/1.0",
        },
    )

    with urlopen(request, timeout=timeout) as response:
        payload = json.loads(response.read().decode("utf-8"))

    return extract_usd_inr_rate(payload)


def get_inr_per_usd():
    cached_rate = cache.get(USD_INR_CACHE_KEY)
    if cached_rate:
        return Decimal(str(cached_rate))

    providers = getattr(
        settings,
        "LMS_EXCHANGE_RATE_PROVIDERS",
        DEFAULT_EXCHANGE_RATE_PROVIDERS,
    )

    timeout = getattr(settings, "LMS_EXCHANGE_RATE_TIMEOUT_SECONDS", 10)
    provider_errors = []

    for url in providers:
        try:
            rate = fetch_rate_from_provider(url, timeout)
        except (
            HTTPError,
            URLError,
            TimeoutError,
            json.JSONDecodeError,
            OSError,
            ValueError,
        ) as exc:
            provider_errors.append(f"{url}: {exc}")
            logger.warning("Exchange rate provider failed: %s", url, exc_info=True)
            continue

        cache_seconds = int(getattr(settings, "LMS_EXCHANGE_RATE_CACHE_SECONDS", 3600))
        if cache_seconds > 0:
            cache.set(USD_INR_CACHE_KEY, str(rate), cache_seconds)

        return rate

    logger.error("All exchange rate providers failed: %s", provider_errors)

    raise ValidationError(
       provider_errors
    )


def quantize_money(amount):
    try:
        decimal_amount = Decimal(str(amount))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError("Invalid payment amount.") from exc

    return decimal_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def amount_to_minor_units(amount):
    return int(
        (Decimal(str(amount)) * 100).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )
    )


def inr_to_usd(amount):
    return quantize_money(Decimal(str(amount)) / get_inr_per_usd())


def payment_pricing(amount_in_inr, international=False):
    amount_in_inr = quantize_money(amount_in_inr)

    if international:
        exchange_rate = get_inr_per_usd()

        return {
            "currency": USD,
            "payment_amount": quantize_money(amount_in_inr / exchange_rate),
            "exchange_rate": exchange_rate,
        }

    return {
        "currency": INR,
        "payment_amount": amount_in_inr,
        "exchange_rate": None,
    }