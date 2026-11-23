"use client";
import { useEffect, useState } from "react";
import { kkError } from "./copy";
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api/" + path, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  }).catch(() => {
    throw Error(
      "Сервермен байланыс орнатылмады. Интернет қосылымын тексеріңіз.",
    );
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error("Серверден жарамсыз жауап келді. Бетті жаңартыңыз.");
  }
  if (!response.ok) throw Error(kkError(data.error));
  return data as T;
}
export function command<T = unknown>(
  name: string,
  args: Record<string, unknown> = {},
) {
  return api<T>("admin/actions/" + encodeURIComponent(name), {
    method: "POST",
    body: JSON.stringify(args),
  });
}
export async function uploadPhoto(
  kind: "couple" | "gallery",
  file: File,
  couple?: string,
) {
  const body = new FormData();
  body.set("kind", kind);
  body.set("photo", file);
  if (couple) body.set("couple", couple);
  return api<{ path: string }>("upload", { method: "POST", body });
}
export function useBackend() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const check = () =>
      api<{ configured: boolean }>("health")
        .then((d) => {
          if (active) setReady(d.configured);
        })
        .catch(() => {
          if (active) setReady(false);
        });
    check();
    const timer = setInterval(check, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return ready;
}
