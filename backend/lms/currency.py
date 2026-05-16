import logging
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

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
_currency_converter = None


def get_currency_converter():
    global _currency_converter
    if _currency_converter is None:
        try:
            from currency_converter import CurrencyConverter
        except ImportError as exc:
            raise ValidationError(
                "Currency conversion package is not installed. Install CurrencyConverter from pip."
            ) from exc

        _currency_converter = CurrencyConverter(
            decimal=True,
            fallback_on_missing_rate=True,
            fallback_on_wrong_date=True,
        )

    return _currency_converter


def get_inr_per_usd():
    cached_rate = cache.get(USD_INR_CACHE_KEY)
    if cached_rate:
        return Decimal(str(cached_rate))

    try:
        rate = Decimal(str(get_currency_converter().convert(1, USD, INR)))
    except Exception as exc:
        logger.exception("CurrencyConverter failed to calculate USD/INR.")
        raise ValidationError("Unable to calculate USD exchange rate.") from exc

    if rate <= 0:
        logger.error("CurrencyConverter returned invalid USD/INR rate: %s", rate)
        raise ValidationError("Unable to calculate USD exchange rate.")

    from django.conf import settings

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
