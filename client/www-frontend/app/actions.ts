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

export async function getToken(){
  const cookieStore = await cookies();
  return cookieStore.get("token")
}
