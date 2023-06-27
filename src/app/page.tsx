import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import styles from "./page.module.css";
import SignInButton from "../components/SignInButton";
import SignOutButton from "../components/SignOutButton";

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <main className={styles.main}>{user ? <SignOutButton /> : <SignInButton />}</main>;
}
