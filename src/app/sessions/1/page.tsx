import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function Session() {
  console.log("session 1 page");
  const supabase = createServerComponentClient({ cookies });

  const result = await supabase.from("messages").select();

  console.log("result", result);

  return (
    <ul className='my-auto'>
      <h1>Session 1{Date.now()}</h1>
      {result.data?.map((message) => (
        <li key={message.id}>
          <pre>{JSON.stringify(message, null, 2)}</pre>
        </li>
      ))}
    </ul>
  );
}
