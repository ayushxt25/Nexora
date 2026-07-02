import argparse
import asyncio
import math
import statistics
import sys
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlparse

import httpx


LOCAL_HOSTS = {"127.0.0.1", "localhost", "0.0.0.0"}


@dataclass
class EndpointStat:
    latencies_ms: list[float] = field(default_factory=list)
    successes: int = 0
    failures: int = 0


@dataclass
class RunStats:
    endpoint_stats: dict[str, EndpointStat] = field(default_factory=lambda: defaultdict(EndpointStat))
    failures_by_endpoint: Counter = field(default_factory=Counter)
    user_results: dict[str, str] = field(default_factory=dict)

    def record(self, key: str, latency_ms: float, success: bool) -> None:
        entry = self.endpoint_stats[key]
        entry.latencies_ms.append(latency_ms)
        if success:
            entry.successes += 1
        else:
            entry.failures += 1
            self.failures_by_endpoint[key] += 1


class LoadTestError(Exception):
    pass


def percentile(values: list[float], point: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    rank = (len(ordered) - 1) * point
    lower = math.floor(rank)
    upper = math.ceil(rank)
    if lower == upper:
        return ordered[lower]
    weight = rank - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local API workflow load simulation for Networking Assistant.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--users", type=int, default=5)
    parser.add_argument("--concurrency", type=int, default=5)
    parser.add_argument("--prefix", default="loadqa")
    parser.add_argument("--include-ai", action="store_true", default=False)
    parser.add_argument("--timeout", type=float, default=20.0)
    return parser.parse_args()


def is_local_url(base_url: str) -> bool:
    try:
        parsed = urlparse(base_url)
    except Exception:
        return False
    return parsed.hostname in LOCAL_HOSTS


async def request_json(
    client: httpx.AsyncClient,
    stats: RunStats,
    method: str,
    path: str,
    *,
    json: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    expected_status: int | tuple[int, ...] = (200, 201),
) -> Any:
    statuses = (expected_status,) if isinstance(expected_status, int) else expected_status
    key = f"{method.upper()} {path}"
    started = time.perf_counter()
    try:
        response = await client.request(method, path, json=json, headers=headers)
        latency_ms = (time.perf_counter() - started) * 1000.0
        success = response.status_code in statuses
        stats.record(key, latency_ms, success)
        if not success:
            raise LoadTestError(f"{key} -> {response.status_code}: {response.text[:300]}")
        if response.content:
            return response.json()
        return None
    except Exception:
        if 'latency_ms' not in locals():
            latency_ms = (time.perf_counter() - started) * 1000.0
            stats.record(key, latency_ms, False)
        raise


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def simulate_user(
    index: int,
    username: str,
    password: str,
    args: argparse.Namespace,
    stats: RunStats,
) -> None:
    timeout = httpx.Timeout(args.timeout)
    async with httpx.AsyncClient(base_url=args.base_url.rstrip("/"), timeout=timeout) as client:
        await request_json(
            client,
            stats,
            "POST",
            "/auth/register",
            json={"username": username, "password": password},
            expected_status=201,
        )
        login = await request_json(
            client,
            stats,
            "POST",
            "/auth/login",
            json={"username": username, "password": password},
            expected_status=200,
        )
        token = login["access_token"]
        headers = auth_headers(token)

        await request_json(
            client,
            stats,
            "PUT",
            "/profile",
            headers=headers,
            json={
                "full_name": f"Load User {index}",
                "headline": "QA workflow simulation",
                "goals": ["networking", "partnerships"],
                "interests": ["ai", "product"],
                "preferred_tone": "friendly",
            },
            expected_status=200,
        )

        contacts = []
        for contact_index in range(3):
            contact = await request_json(
                client,
                stats,
                "POST",
                "/contacts",
                headers=headers,
                json={
                    "name": f"Contact {index}-{contact_index}",
                    "company": f"Company {contact_index}",
                    "role": "Founder",
                    "email": f"{username}.{contact_index}@example.test",
                    "notes": "Created by load workflow",
                    "tags": ["load", "qa", f"group-{contact_index}"],
                    "relationship_strength": min(5, 3 + contact_index),
                },
                expected_status=201,
            )
            contacts.append(contact)

        event = await request_json(
            client,
            stats,
            "POST",
            "/events",
            headers=headers,
            json={
                "title": f"Load Event {index}",
                "description": "Workflow validation event",
                "location": "Virtual",
                "event_date": (datetime.now(UTC) + timedelta(days=2)).isoformat(),
                "goals": ["partnerships", "outreach"],
            },
            expected_status=201,
        )

        for contact_index, contact in enumerate(contacts):
            await request_json(
                client,
                stats,
                "POST",
                "/interactions",
                headers=headers,
                json={
                    "contact_id": contact["id"],
                    "event_id": event["id"] if contact_index == 0 else None,
                    "interaction_type": "meeting" if contact_index == 0 else "email",
                    "notes": f"Load interaction {contact_index}",
                    "sentiment": "positive" if contact_index % 2 == 0 else "neutral",
                },
                expected_status=201,
            )

        follow_ups = []
        follow_up_payloads = [
            {
                "contact_id": contacts[0]["id"],
                "event_id": event["id"],
                "title": "Follow up after event",
                "description": "Send summary and next steps",
                "due_date": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
                "status": "pending",
            },
            {
                "contact_id": contacts[1]["id"],
                "title": "Reconnect with contact",
                "description": "Share relevant article",
                "due_date": (datetime.now(UTC) + timedelta(days=3)).isoformat(),
                "status": "pending",
            },
        ]
        for payload in follow_up_payloads:
            follow_up = await request_json(
                client,
                stats,
                "POST",
                "/follow-ups",
                headers=headers,
                json=payload,
                expected_status=201,
            )
            follow_ups.append(follow_up)

        await request_json(client, stats, "GET", "/analytics/summary", headers=headers)
        recommendations = await request_json(client, stats, "GET", "/recommendations", headers=headers)
        next_best = await request_json(client, stats, "GET", "/recommendations/next-best-actions", headers=headers)
        opportunities = await request_json(client, stats, "GET", "/opportunities", headers=headers)
        await request_json(client, stats, "GET", "/relationships/scores", headers=headers)
        await request_json(client, stats, "GET", "/network/graph-insights", headers=headers)
        await request_json(client, stats, "GET", "/follow-ups", headers=headers)

        if recommendations:
            first = recommendations[0]
            await request_json(
                client,
                stats,
                "POST",
                "/action-lifecycle",
                headers=headers,
                json={
                    "entity_kind": "recommendation",
                    "entity_id": first["recommendation_id"],
                    "entity_type": first["recommendation_type"],
                    "status": "accepted",
                    "notes": "load-test accept",
                },
            )
            await request_json(
                client,
                stats,
                "POST",
                "/action-lifecycle",
                headers=headers,
                json={
                    "entity_kind": "recommendation",
                    "entity_id": first["recommendation_id"],
                    "entity_type": first["recommendation_type"],
                    "status": "completed",
                    "notes": "load-test complete",
                },
            )
            if len(recommendations) > 1:
                second = recommendations[1]
                await request_json(
                    client,
                    stats,
                    "POST",
                    "/action-lifecycle",
                    headers=headers,
                    json={
                        "entity_kind": "recommendation",
                        "entity_id": second["recommendation_id"],
                        "entity_type": second["recommendation_type"],
                        "status": "dismissed",
                        "notes": "load-test dismiss",
                    },
                )
            convert_source = next(
                (
                    item
                    for item in (next_best or recommendations)
                    if item.get("related_contact_id") or item.get("related_event_id")
                ),
                None,
            )
            if convert_source:
                await request_json(
                    client,
                    stats,
                    "POST",
                    "/action-lifecycle/convert-to-follow-up",
                    headers=headers,
                    json={
                        "entity_kind": "recommendation",
                        "entity_id": convert_source["recommendation_id"],
                        "entity_type": convert_source["recommendation_type"],
                        "contact_id": convert_source.get("related_contact_id"),
                        "event_id": convert_source.get("related_event_id"),
                        "title": f"Load convert recommendation {index}",
                        "description": convert_source.get("description") or "Converted by load workflow",
                        "due_date": (datetime.now(UTC) + timedelta(days=4)).isoformat(),
                        "status": "pending",
                        "notes": "load-test conversion",
                    },
                )

        if opportunities:
            first = opportunities[0]
            await request_json(
                client,
                stats,
                "POST",
                "/action-lifecycle",
                headers=headers,
                json={
                    "entity_kind": "opportunity",
                    "entity_id": first["opportunity_id"],
                    "entity_type": first["opportunity_type"],
                    "status": "accepted",
                    "notes": "load-test accept",
                },
            )
            await request_json(
                client,
                stats,
                "POST",
                "/action-lifecycle",
                headers=headers,
                json={
                    "entity_kind": "opportunity",
                    "entity_id": first["opportunity_id"],
                    "entity_type": first["opportunity_type"],
                    "status": "completed",
                    "notes": "load-test complete",
                },
            )
            if len(opportunities) > 1:
                second = opportunities[1]
                await request_json(
                    client,
                    stats,
                    "POST",
                    "/action-lifecycle",
                    headers=headers,
                    json={
                        "entity_kind": "opportunity",
                        "entity_id": second["opportunity_id"],
                        "entity_type": second["opportunity_type"],
                        "status": "dismissed",
                        "notes": "load-test dismiss",
                    },
                )
            convert_source = next(
                (
                    item
                    for item in opportunities
                    if item.get("related_contact_id") or item.get("related_event_id")
                ),
                None,
            )
            if convert_source:
                await request_json(
                    client,
                    stats,
                    "POST",
                    "/action-lifecycle/convert-to-follow-up",
                    headers=headers,
                    json={
                        "entity_kind": "opportunity",
                        "entity_id": convert_source["opportunity_id"],
                        "entity_type": convert_source["opportunity_type"],
                        "contact_id": convert_source.get("related_contact_id"),
                        "event_id": convert_source.get("related_event_id"),
                        "title": f"Load convert opportunity {index}",
                        "description": convert_source.get("description") or "Converted by load workflow",
                        "due_date": (datetime.now(UTC) + timedelta(days=5)).isoformat(),
                        "status": "pending",
                        "notes": "load-test conversion",
                    },
                )

        await request_json(client, stats, "GET", "/history", headers=headers)
        await request_json(client, stats, "GET", "/feedback-history", headers=headers)

        if args.include_ai:
            await request_json(
                client,
                stats,
                "POST",
                "/generate-conversation",
                headers=headers,
                json={
                    "description": "Meeting founders at an AI networking event",
                    "interests": ["ai", "product", "networking"],
                },
            )
            await request_json(
                client,
                stats,
                "POST",
                "/fact-check",
                headers=headers,
                json={"query": "OpenAI"},
            )


def print_summary(args: argparse.Namespace, stats: RunStats, started_at: float) -> None:
    all_latencies = [
        latency
        for endpoint in stats.endpoint_stats.values()
        for latency in endpoint.latencies_ms
    ]
    total_requests = len(all_latencies)
    successful_requests = sum(endpoint.successes for endpoint in stats.endpoint_stats.values())
    failed_requests = sum(endpoint.failures for endpoint in stats.endpoint_stats.values())

    print("\n=== Local Workflow Load Summary ===")
    print(f"Base URL: {args.base_url}")
    print(f"Users: {args.users} | Concurrency: {min(args.concurrency, args.users)} | Include AI: {args.include_ai}")
    print("Note: local SQLite results may differ significantly from future PostgreSQL production behavior.")
    print(f"Elapsed seconds: {time.perf_counter() - started_at:.2f}")
    print(f"Total requests: {total_requests}")
    print(f"Successful requests: {successful_requests}")
    print(f"Failed requests: {failed_requests}")
    print(f"Overall p50 latency ms: {percentile(all_latencies, 0.50):.2f}")
    print(f"Overall p95 latency ms: {percentile(all_latencies, 0.95):.2f}")
    print(f"Overall max latency ms: {max(all_latencies) if all_latencies else 0.0:.2f}")

    print("\nPer-user workflow results:")
    for username, result in sorted(stats.user_results.items()):
        print(f"  {username}: {result}")

    print("\nPer-endpoint summary:")
    for key in sorted(stats.endpoint_stats):
        entry = stats.endpoint_stats[key]
        print(
            f"  {key}: count={len(entry.latencies_ms)} ok={entry.successes} fail={entry.failures} "
            f"p50={percentile(entry.latencies_ms, 0.50):.2f}ms "
            f"p95={percentile(entry.latencies_ms, 0.95):.2f}ms "
            f"max={max(entry.latencies_ms) if entry.latencies_ms else 0.0:.2f}ms"
        )

    if stats.failures_by_endpoint:
        print("\nFailures by endpoint:")
        for key, count in stats.failures_by_endpoint.most_common():
            print(f"  {key}: {count}")


async def bounded_user_workflow(
    semaphore: asyncio.Semaphore,
    index: int,
    username: str,
    password: str,
    args: argparse.Namespace,
    stats: RunStats,
) -> None:
    async with semaphore:
        try:
            await simulate_user(index, username, password, args, stats)
            stats.user_results[username] = "success"
        except Exception as exc:
            stats.user_results[username] = f"failure: {exc}"


async def main_async(args: argparse.Namespace) -> int:
    if not is_local_url(args.base_url):
        print(
            "WARNING: base-url does not look local. This script is intended for local environments only.",
            file=sys.stderr,
        )

    users = max(1, args.users)
    concurrency = max(1, min(args.concurrency, users))
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    stats = RunStats()
    started_at = time.perf_counter()
    semaphore = asyncio.Semaphore(concurrency)

    tasks = []
    for index in range(users):
        username = f"{args.prefix}_{timestamp}_{index}"
        password = f"LoadQaPass!{index:03d}"
        tasks.append(
            bounded_user_workflow(semaphore, index, username, password, args, stats)
        )

    await asyncio.gather(*tasks)
    print_summary(args, stats, started_at)
    return 0 if all(result == "success" for result in stats.user_results.values()) else 1


def main() -> int:
    args = parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    raise SystemExit(main())
