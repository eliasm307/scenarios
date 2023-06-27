import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "../../../supabase";

export default async function Session() {
  console.log("session 1 page");
  const supabase = createServerComponentClient<Database>({ cookies });

  const { data: messages } = await supabase.from("messages").select();

  return (
    <ul className='my-auto'>
      <h1>Session 1{Date.now()}</h1>
      {messages?.map((message) => (
        <li key={message.id}>
          <pre>{JSON.stringify(message, null, 2)}</pre>
        </li>
      ))}
    </ul>
  );
}
