import pytest


ADMIN_ENDPOINTS = [
    ("GET", "/metrics"),
    ("GET", "/metrics/summary"),
    ("GET", "/admin/feedback/summary"),
    ("GET", "/admin/feedback"),
    ("GET", "/audit/logs"),
    ("GET", "/retrieval/debug?q=test"),
    ("GET", "/recommendations/training-data"),
    ("POST", "/recommendations/train-ranker"),
    ("GET", "/recommendations/ranker-status"),
]


@pytest.mark.parametrize(("method", "path"), ADMIN_ENDPOINTS)
def test_unauthenticated_requests_to_admin_endpoints_return_401(client, method, path):
    response = client.request(method, path)
    assert response.status_code == 401


@pytest.mark.parametrize(("method", "path"), ADMIN_ENDPOINTS)
def test_normal_user_requests_to_admin_endpoints_return_403(client, auth_headers, method, path):
    response = client.request(method, path, headers=auth_headers)
    assert response.status_code == 403


@pytest.mark.parametrize(("method", "path"), ADMIN_ENDPOINTS)
def test_admin_user_requests_to_admin_endpoints_succeed(client, admin_headers, method, path):
    response = client.request(method, path, headers=admin_headers)
    assert response.status_code == 200


def test_normal_user_endpoints_still_work(client, auth_headers):
    response = client.get("/recommendations", headers=auth_headers)
    assert response.status_code == 200
