"""
Custom exception handler and exceptions for MentiQ API.
Provides consistent error response format across all endpoints.
"""
import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns consistent JSON error responses.
    Format: { "success": false, "error": { "code": str, "message": str, "details": dict } }
    """
    # Call DRF's default handler first
    response = exception_handler(exc, context)

    if isinstance(exc, DjangoValidationError):
        exc = ValidationError(detail=exc.messages)
        response = exception_handler(exc, context)

    if response is not None:
        error_payload = {
            'success': False,
            'error': {
                'code': _get_error_code(response.status_code),
                'message': _get_error_message(exc),
                'details': _get_error_details(response.data),
            }
        }
        response.data = error_payload
    else:
        # Unhandled exception
        logger.exception(f"Unhandled exception: {exc}", exc_info=exc)
        response = Response(
            {
                'success': False,
                'error': {
                    'code': 'INTERNAL_SERVER_ERROR',
                    'message': 'An unexpected error occurred. Please try again later.',
                    'details': {}
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response


def _get_error_code(status_code):
    codes = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        405: 'METHOD_NOT_ALLOWED',
        409: 'CONFLICT',
        429: 'TOO_MANY_REQUESTS',
        500: 'INTERNAL_SERVER_ERROR',
    }
    return codes.get(status_code, 'ERROR')


def _get_error_message(exc):
    if hasattr(exc, 'detail'):
        if isinstance(exc.detail, str):
            return exc.detail
        if isinstance(exc.detail, list):
            return exc.detail[0] if exc.detail else 'Validation error'
        if isinstance(exc.detail, dict):
            first_key = next(iter(exc.detail), None)
            if first_key:
                val = exc.detail[first_key]
                if isinstance(val, list):
                    return f"{first_key}: {val[0]}"
                return f"{first_key}: {val}"
    return str(exc)


def _get_error_details(data):
    if isinstance(data, dict):
        return {k: v[0] if isinstance(v, list) and len(v) == 1 else v for k, v in data.items()}
    if isinstance(data, list):
        return {'errors': data}
    return {}


# Custom Exceptions
class ConflictError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Resource conflict.'
    default_code = 'conflict'


class BusinessLogicError(APIException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = 'Business rule violation.'
    default_code = 'business_logic_error'


class PaymentError(APIException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = 'Payment required.'
    default_code = 'payment_required'


class QuotaExceededError(APIException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'Quota exceeded.'
    default_code = 'quota_exceeded'
