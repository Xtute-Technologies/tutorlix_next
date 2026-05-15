import json
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.cache import cache
from rest_framework.exceptions import ValidationError


INR = "INR"
USD = "USD"
PAYMENT_CURRENCY_CHOICES = (
    (INR, "Indian Rupee"),
    (USD, "US Dollar"),
)
USD_INR_CACHE_KEY = "lms:exchange-rate:usd-inr"


def get_inr_per_usd():
    cached_rate = cache.get(USD_INR_CACHE_KEY)
    if cached_rate:
        return Decimal(str(cached_rate))

    url = getattr(
        settings,
        "LMS_EXCHANGE_RATE_API_URL",
        "https://api.frankfurter.dev/v2/rate/USD/INR",
    )
    timeout = getattr(settings, "LMS_EXCHANGE_RATE_TIMEOUT_SECONDS", 5)

    try:
        request = Request(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "Tutorlix/1.0 (+https://tutorlix.com)",
            },
        )
        with urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
        raw_rate = payload.get("rate")
        if raw_rate is None:
            raw_rate = payload.get("rates", {}).get(INR)
        rate = Decimal(str(raw_rate))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        raise ValidationError("Unable to fetch the latest USD to INR exchange rate.") from exc
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError("Invalid USD to INR exchange rate received from provider.") from exc

    if rate <= 0:
        raise ValidationError("USD to INR exchange rate must be greater than zero.")

    cache_seconds = int(getattr(settings, "LMS_EXCHANGE_RATE_CACHE_SECONDS", 3600))
    if cache_seconds > 0:
        cache.set(USD_INR_CACHE_KEY, str(rate), cache_seconds)
    return rate


def quantize_money(amount):
    try:
        decimal_amount = Decimal(str(amount))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError("Invalid payment amount.") from exc

    return decimal_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def amount_to_minor_units(amount):
    return int((Decimal(str(amount)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def inr_to_usd(amount):
    return quantize_money(Decimal(str(amount)) / get_inr_per_usd())


def payment_pricing(amount_in_inr, international=False):
    amount_in_inr = quantize_money(amount_in_inr)
    if international:
        return {
            "currency": USD,
            "payment_amount": inr_to_usd(amount_in_inr),
            "exchange_rate": get_inr_per_usd(),
        }

    return {
        "currency": INR,
        "payment_amount": amount_in_inr,
        "exchange_rate": None,
    }
