import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page-pad">
      <h1 className="display page-title">Missing</h1>
      <p className="mt-6 max-w-md">That page is not in the catalogue.</p>
      <Link href="/" className="mt-8 inline-block text-sm font-bold uppercase underline">
        Back home
      </Link>
    </section>
  );
}
