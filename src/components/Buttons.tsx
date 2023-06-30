import Link from "next/link";

export function SignInButton() {
  return (
    <Link href='/login' className='text-neutral-100 hover:underline'>
      Login
    </Link>
  );
}
