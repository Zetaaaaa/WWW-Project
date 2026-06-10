"use server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

export async function ensureUuidCookie() {
  const cookieStore = await cookies();

  let uuid = cookieStore.get("uuid")?.value;

  if (!uuid) {
    uuid = uuidv4();
    cookieStore.set("uuid", uuid, { httpOnly: true, secure: true });
  }
  return uuid;
}

export async function setTokenCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set("token", token, { httpOnly: true, secure: true });
}

export async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get("token");
}

export async function getUsername(token: string) {
  const response = await fetch("http://localhost:3001/api/token/username", {
    method: "POST",
    headers: {
      "Content-Type": "Application/json",
      Authorization: `Bearer ${token?.value}`,
    },
  });
  const result = await response.text();
  return result;
}

export async function checkAccess(token: string, lobbyCode: string) {
  console.log("ASDASUDASY*GD*AGS");

  const response = await fetch("http://localhost:3001/api/route/checkAccess", {
    method: "POST",
    headers: {
      "Content-Type": "Application/json",
      Authorization: `Bearer ${token?.value}`,
    },
    body: JSON.stringify({ code: lobbyCode }),
  });
  
  const result = await response.text();
  return result === "true"; // Returns actual boolean true/false
}
